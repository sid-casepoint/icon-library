# Internal Icon Library

A fast, searchable, and self-hosted Icon Library for our team. Hosted entirely on **GitHub Pages** with automated SVG optimization using **GitHub Actions** and **Bun**.

## 🎨 How to Add or Delete Icons

Team members can add or remove icons **directly from the Web UI** without needing a GitHub account!

1. Click the **Upload** button in the top right of the Web UI.
2. Select your SVG file, provide a name and a category.
3. Enter the **Team Upload Password** provided by your admin.
4. Click Upload! 

The app securely talks to GitHub in the background to commit the file. GitHub Actions will rebuild the site in about 1-2 minutes.

To delete an icon, click on it, and select **Delete Icon** in the bottom corner of the modal.

---

## 🔒 Administrator Setup

Because team members do not have GitHub access, this site uses a securely encrypted **Fine-Grained Personal Access Token** embedded in the frontend. Only users with the Team Password can decrypt the token to trigger uploads.

**To configure the upload system:**

1. Go to GitHub > Settings > Developer Settings > Personal Access Tokens > Fine-grained tokens.
2. Generate a token scoped **ONLY** to this specific repository, with **Read and Write** access to **Contents**.
3. Clone this repository locally, and run the token encryptor script:
   ```bash
   bun run scripts/encrypt-token.js
   ```
4. Follow the prompts to enter your token and choose a secure "Team Password".
5. Copy the generated JSON block.
6. Open `app.js` and paste your GitHub username, repository name, and the generated JSON block at the top of the file:
   ```javascript
   const GITHUB_OWNER = 'YOUR_GITHUB_USERNAME';
   const GITHUB_REPO = 'YOUR_REPO_NAME';
   const ENCRYPTED_TOKEN_DATA = { ... }; // Paste here
   ```
7. Commit these changes and push to `main`. 

> **Important**: Never put your raw GitHub token in the code. Always use the encryption script.

---

## 🛠 Features

- **Search & Filter**: Instantly find icons by name or tags.
- **Live Preview**: Test icons at different sizes and colors directly in the browser.
- **Developer Ready**: Click on an icon to instantly copy its **Raw SVG**, **React component (JSX)**, or **Vue component**.
- **Downloads**: Download individual `.svg` files or the entire categorized `sprite.svg` bundle.

## 🚀 Local Development (Optional)

If you want to run the library locally to test changes:

1. Install [Bun](https://bun.sh) if you haven't already.
2. Install dependencies: `bun install`
3. Build the icon assets: `bun run build`
4. Start a local dev server: `bun start`
