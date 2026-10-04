#!/usr/bin/env python3
"""
OpenAI-compatible API engine (external providers).

Unlike the other engines this one does not drive a web app: it calls a real API with the person's own key. It serves
every connection (see connections.py): OpenAI, OpenRouter, DeepSeek, Groq, Together, Mistral, Ollama, LM Studio, vLLM
and anything else that speaks `POST {base_url}/chat/completions`. The model arrives as `connection/model`.

Always streams from the provider (a non-streaming request is assembled by engines.generate_chat). Reasoning text in
`reasoning_content` or `reasoning` is passed on as `reasoning_content`. The key is never logged or shown: every
error text goes through connections.redact first.
"""

import json
import time
import uuid
from typing import Any, AsyncIterator, Callable, Dict, List, Optional

import httpx

try:
    from singularity import connections as rules
    from singularity import db
except ImportError:  # run from inside singularity/
    import connections as rules
    import db

CONNECT_TIMEOUT = 15.0
READ_TIMEOUT = 300.0   # a reasoning model can be silent for minutes
ERROR_BODY_CHARS = 400

# Tests replace this to avoid the network.
client_factory: Callable[[], httpx.AsyncClient] = lambda: httpx.AsyncClient(
    timeout=httpx.Timeout(connect=CONNECT_TIMEOUT, read=READ_TIMEOUT, write=30.0, pool=15.0), follow_redirects=False, trust_env=False)


def request_headers(conn: Dict[str, Any]) -> Dict[str, str]:
    headers = {"Content-Type": "application/json", "Accept": "text/event-stream", "User-Agent": "Singularity-Gateway/2.0"}
    headers.update(conn.get("headers") or {})
    if conn.get("api_key"):
        headers["Authorization"] = f"Bearer {conn['api_key']}"
    return headers


def _error_text(conn: Dict[str, Any], status: int, body: str) -> str:
    name = conn["name"]
    detail = ""
    try:
        data = json.loads(body)
        err = data.get("error", data) if isinstance(data, dict) else data
        detail = err.get("message") if isinstance(err, dict) else str(err)
    except ValueError:
        detail = body
    detail = " ".join(str(detail or "").split())[:ERROR_BODY_CHARS]
    if status in (401, 403):
        text = f"{name} rejected the API key (HTTP {status}). Check the key in Connections."
    elif status == 404:
        text = f"{name} says the model or address was not found (HTTP 404). Check the model id and the base URL."
    elif status == 429:
        text = f"{name} is rate limiting this key (HTTP 429)."
    elif status == 402:
        text = f"{name} says the account is out of credit (HTTP 402)."
    else:
        text = f"{name} answered HTTP {status}."
    return text + (f" {detail}" if detail else "")


def _chunk(chat_id: str, model: str, delta: Dict[str, Any], finish: Optional[str] = None) -> Dict[str, Any]:
    return {"id": chat_id, "object": "chat.completion.chunk", "created": int(time.time()), "model": model,
            "choices": [{"index": 0, "delta": delta, "finish_reason": finish}]}


def build_payload(upstream_model: str, messages: List[Dict[str, Any]], kwargs: Dict[str, Any]) -> Dict[str, Any]:
    payload: Dict[str, Any] = {"model": upstream_model, "messages": messages, "stream": True}
    for key in rules.FORWARDED_PARAMS:
        if kwargs.get(key) is not None:
            payload[key] = kwargs[key]
    return payload


async def stream_openai_compat_chat(
    model: str,
    messages: List[Dict[str, Any]],
    accounts: Optional[List[Dict[str, Any]]] = None,
    stream: bool = True,
    **kwargs: Any,
) -> AsyncIterator[Dict[str, Any]]:
    chat_id = f"chatcmpl-ext-{uuid.uuid4().hex[:12]}"
    found = db.find_connection_for_model(model)
    if not found:
        yield _chunk(chat_id, model, {"content": f"No connection matches '{model}'. Add one in Connections, or check it is switched on."}, "error")
        return
    conn, upstream_model = found
    secrets = [conn.get("api_key", "")]
    if conn["requires_key"] and not conn.get("api_key"):
        yield _chunk(chat_id, model, {"content": f"{conn['name']} needs an API key. Add one in Connections."}, "error")
        return
    url = f"{conn['base_url']}/chat/completions"
    payload = build_payload(upstream_model, messages, kwargs)
    yield _chunk(chat_id, model, {"role": "assistant"})
    finished = False
    try:
        async with client_factory() as client:
            async with client.stream("POST", url, json=payload, headers=request_headers(conn)) as res:
                if res.status_code >= 300:
                    body = (await res.aread()).decode("utf-8", "replace")
                    yield _chunk(chat_id, model, {"content": rules.redact(_error_text(conn, res.status_code, body), secrets)}, "error")
                    return
                async for line in res.aiter_lines():
                    line = line.strip()
                    if not line.startswith("data:"):
                        continue   # blank lines and `: keep-alive` comments
                    data = line[5:].strip()
                    if data == "[DONE]":
                        break
                    try:
                        obj = json.loads(data)
                    except ValueError:
                        continue
                    if isinstance(obj, dict) and obj.get("error"):
                        err = obj["error"]
                        message = err.get("message") if isinstance(err, dict) else str(err)
                        yield _chunk(chat_id, model, {"content": rules.redact(f"{conn['name']}: {message}", secrets)}, "error")
                        return
                    choice = ((obj.get("choices") or [{}])[0]) if isinstance(obj, dict) else {}
                    delta = choice.get("delta") or {}
                    out: Dict[str, Any] = {}
                    if isinstance(delta.get("content"), str) and delta["content"]:
                        out["content"] = delta["content"]
                    thought = delta.get("reasoning_content") or delta.get("reasoning")
                    if isinstance(thought, str) and thought:
                        out["reasoning_content"] = thought
                    reason = choice.get("finish_reason")
                    if out:
                        yield _chunk(chat_id, model, out)
                    if reason:
                        finished = True
                        yield _chunk(chat_id, model, {}, "length" if reason == "length" else "stop")
    except httpx.TimeoutException:
        yield _chunk(chat_id, model, {"content": f"{conn['name']} did not answer in time."}, "error")
        return
    except httpx.HTTPError as e:
        yield _chunk(chat_id, model, {"content": rules.redact(f"Could not reach {conn['name']} ({e.__class__.__name__}). Check the base URL.", secrets)}, "error")
        return
    if not finished:
        yield _chunk(chat_id, model, {}, "stop")


async def fetch_models(conn: Dict[str, Any]) -> List[str]:
    """Ask the provider for its model list (`GET {base_url}/models`). Raises rules.ConnectionConfigError with a readable message."""
    secrets = [conn.get("api_key", "")]
    headers = request_headers(conn)
    headers["Accept"] = "application/json"
    try:
        async with client_factory() as client:
            res = await client.get(f"{conn['base_url']}/models", headers=headers)
    except httpx.TimeoutException:
        raise rules.ConnectionConfigError(f"{conn['name']} did not answer in time.")
    except httpx.HTTPError as e:
        raise rules.ConnectionConfigError(rules.redact(f"Could not reach {conn['name']} ({e.__class__.__name__}). Check the base URL.", secrets))
    if res.status_code >= 300:
        raise rules.ConnectionConfigError(rules.redact(_error_text(conn, res.status_code, res.text), secrets))
    try:
        ids = rules.parse_models(res.json())
    except ValueError:
        ids = []
    if not ids:
        raise rules.ConnectionConfigError(f"{conn['name']} answered, but its model list was empty or in a format Singularity does not know. Add the model ids by hand.")
    return ids
