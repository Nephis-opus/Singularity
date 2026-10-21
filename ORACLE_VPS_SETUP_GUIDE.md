# 🚀 Oracle Cloud Free Tier — Complete Foolproof Setup Guide

> **Hey!** This guide is made so you don't need to know anything about coding or tech. Just follow each step one by one, click the exact buttons shown below, and once you're done, you send me two things and you never have to touch this ever again!

---

## 📌 Before You Start: 3 Quick Facts

1. **Is this actually 100% Free?**  
   **YES.** Oracle Cloud has an official **"Always Free"** tier. It will never charge you.
2. **Why does it ask for a credit/debit card?**  
   Just like Netflix or Amazon free trials, Oracle requires a card purely to verify that you are a real human living in Canada and not an internet bot creating spam accounts.
3. **Will my card be charged?**  
   Oracle puts a temporary verification hold of **around $1 to $2 CAD** to test if the card is active. **This is NOT a charge** — the money is automatically released back to your bank within 3 to 5 business days. You will **never** be billed.

---

## 📝 STEP 1: Sign Up for Oracle Cloud

1. Open this link on your computer:  
   👉 **[https://www.oracle.com/cloud/free/](https://www.oracle.com/cloud/free/)**
2. Click the big green button that says **"Start for free"**.
3. Fill in the initial form:
   - **Country/Territory**: Select **Canada**.
   - **First Name & Last Name**: Your real name (matching your bank card).
   - **Email**: Your real email.
4. Pass the robot captcha check.
5. Click **"Verify my email"**.
6. Open your email inbox, find the email from Oracle, and click the link to confirm your email.

---

## 🔑 STEP 2: Account Setup & Picking Region

After clicking the email verification link, a setup page will open:

1. **Password**: Create a password (must have at least 8 characters, an uppercase letter, a lowercase letter, a number, and a symbol like `@` or `!`).
2. **Cloud Account Name** (Tenancy Name):  
   - Type any simple lowercase name with no spaces (for example: `johnserver24` or `canadacloud99`). Remember this name!
3. **Home Region** *(⚠️ CRITICAL STEP — CANNOT BE CHANGED LATER)*:  
   - Look for **Home Region**.
   - Select either **Canada Southeast (Toronto)** or **Canada East (Montreal)**.
4. **Address & Phone**:
   - Enter your real Canadian billing address (it must match the address on your bank card).
   - Enter your phone number and type the SMS verification code they text you.

---

## 💳 STEP 3: Payment Verification ($0 Hold)

1. Click **"Add Payment Verification Method"** -> Select **Credit Card**.
2. Enter your card details:
   - Standard credit card or bank debit card (Visa / Mastercard / Amex).
   - *Note: Prepaid cards like Vanilla Visa or temporary virtual cards do not work.*
3. Click **Submit**. Your bank may send an SMS approval prompt or temporary authorization.
4. Check the box agreeing to the terms.
5. Click **"Complete Sign-Up"**.

> ⏳ *Wait 1–2 minutes while Oracle prepares your account. Once ready, it will redirect you to the main Oracle Cloud Dashboard.*

---

## 🖥️ STEP 4: Create the Free Server (Click-by-Click)

1. Go to the dashboard: **[https://cloud.oracle.com/](https://cloud.oracle.com/)** and log in.
2. In the top-left corner, click the **Hamburger Menu** (the 3 horizontal lines `☰`).
3. Click **Compute** ➔ then click **Instances**.
4. Click the blue button that says **"Create instance"**.

Now fill in these exact settings:

### A. Name
- Type: `singularity-server` (or leave the default name).

### B. Image and Shape (Look for the "Edit" buttons on the right)
1. Next to **Image**, click **Edit**:
   - Click **Change image**.
   - Select **Canonical Ubuntu**.
   - Under version, choose **Ubuntu 24.04** or **Ubuntu 22.04 Minimal**.
   - Click **Select image**.
2. Next to **Shape**, click **Edit**:
   - Click **Change shape**.
   - Select **Ampere** (ARM-based `VM.Standard.A1.Flex`).
   - If available, set OCPU to `2` and RAM to `12` GB (or up to `4` OCPUs and `24` GB RAM).
   - *If Ampere says "Out of capacity", choose **AMD** -> `VM.Standard.E2.1.Micro` (Always Free).*
   - **Make sure it shows the green badge: "Always Free Eligible"**.
   - Click **Select shape**.

### C. Networking
- Leave everything as default (**"Create new virtual cloud network"** and **"Assign a public IPv4 address"** checked).

### D. 🔑 SSH Keys *(THE MOST IMPORTANT STEP!)*
- Under the **Add SSH keys** section, leave **"Generate SSH key pair"** selected.
- Click the button that says:
  👉 **"Save private key"** (This downloads a file like `ssh-key-xxxx.key`).
- Also click **"Save public key"** just in case.
- ⚠️ **DO NOT LOSE THIS FILE! Put it on your Desktop.**

### E. Create!
- Scroll to the bottom and click the big blue **"Create"** button.

---

## 🎯 STEP 5: Grab the IP Address & Send to Me

1. You will be on the server details page.
2. The status will say **PROVISIONING** (orange icon).
3. Wait about 1 to 2 minutes until it turns **RUNNING** (green icon).
4. Look on the screen for **"Public IP Address"**:
   - It will look something like `152.67.xxx.xxx`.
   - Click the little copy icon next to it.

---

## 📦 What You Send Me (You Are Done!)

Send me these **2 things** on Discord / WhatsApp / Telegram:

1. **The Public IP Address** (e.g. `152.67.45.120`).
2. **The Private Key file** you downloaded (`ssh-key-xxxx.key`).

🎉 **THAT'S IT!** Once you send me those two things, I can log in, install the software, configure the security, set up the 24/7 background system, and you never have to open Oracle ever again!

---

## 👑 OPTIONAL: Give Me Full Oracle Account Access (So You Never Have to Touch Anything)

If you don't even want to be asked if the server ever needs a reboot or firewall change, you can add my email as an Admin so I can log in directly:

1. In the Oracle Cloud Console, click the **☰ Menu** (top-left).
2. Go to **Identity & Security** ➔ **Domains**.
3. Click on the **Default** domain.
4. On the left menu, click **Users** ➔ click the blue **"Create user"** button.
5. Enter:
   - **First Name**: Admin
   - **Last Name**: Singularity
   - **Email / Username**: *(Ask me for my email address to put here)*
6. Click **Create**.
7. Now on the left menu, click **Groups** ➔ click on **Administrators**.
8. Click **"Add user to group"**, select the new user you just created, and click **Add**.

*Done! Oracle will email me an invite link so I can manage everything directly.*
