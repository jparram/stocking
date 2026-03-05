# Stocking 🛒

A personal grocery list web app that runs entirely in the browser. Items are saved in `localStorage` so your list persists between visits.

## Features

- **Add items** with a name, quantity, and category (Produce, Dairy, Meat, Bakery, etc.)
- **Check items off** as you place them in your cart
- **Delete individual items** or remove all checked items at once
- **Filter by category** to focus on one section of the store
- **Persistent storage** – your list is saved automatically in the browser (no server required)
- **Mobile-friendly** responsive layout

## Project Structure

```
stocking/
├── index.html       # Main page
├── css/
│   └── style.css    # Styles
├── js/
│   └── app.js       # App logic
├── amplify.yml      # AWS Amplify build config
└── README.md
```

## Deploying to AWS Amplify

1. Push this repository to GitHub (already done).
2. Sign in to the [AWS Amplify Console](https://console.aws.amazon.com/amplify/).
3. Choose **New app → Host web app**.
4. Connect your GitHub account and select the **stocking** repository and the `master` branch.
5. Amplify will detect the `amplify.yml` build configuration automatically.
6. Click **Save and deploy**. Your site will be live at an Amplify-generated URL in a few minutes.

No build tools or package managers are required – this is a pure HTML/CSS/JavaScript static site.

## Running Locally

Simply open `index.html` in your browser:

```bash
open index.html   # macOS
# or double-click index.html in your file manager
```

For a slightly more realistic preview you can also use any local static server, e.g.:

```bash
npx serve .
```