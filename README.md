# HyperDrive

HyperDrive is a free theme for the Astro framework, designed to provide a beautiful and functional starting point for your next car dealer website. Whether you're selling Cars, Bikes or Boats, or any other similar product, HyperDrive has you covered with its clean design and easy-to-use components.

## 🌟 About HyperDrive

HyperDrive is perfect for car dealers looking to create a modern, responsive website. It features a range of premade pages and components that can be easily customized to fit your brand. The theme is built with Astro, ensuring fast load times and excellent performance.

## 🛠️ Technologies Used

-   **Astro**: The core framework for building fast, content-focused websites.
-   **TailwindCSS**: A utility-first CSS framework for rapid UI development.
-   **Embla Carousel**: A modern slider library for creating responsive sliders.

## 🚀 Installation and Deployment

To get started with HyperDrive, follow these steps:

1. **Clone HyperDrive**:

    ```sh
    git clone https://github.com/wpinfusion/astro-hyperdrive.git
    ```

2. **Install Dependencies**:

    ```sh
    npm install
    ```

3. **Run Development Server**:

    ```sh
    npm run dev
    ```

4. **Build for Production**:

    ```sh
    npm run build
    ```

## Account and admin setup

The site uses Supabase Auth for customer and admin accounts. Configure these server environment variables:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

Apply the migrations in `supabase/migrations`, including
`20260730_add_user_accounts_and_quote_ownership.sql`.

Create the first admin as a normal account at `/register/`, then promote that account in the Supabase SQL Editor:

```sql
update public.profiles
set role = 'admin', updated_at = now()
where email = 'admin@example.com';
```

The admin can then sign in at `/admin/` with that account. `ADMIN_PASSWORD` is no longer used.

## Quote status emails

Approving or rejecting a quote saves its status and sends the customer an email through Resend.
Approval automatically generates a PDF invoice on the server and attaches it to the email.
The invoice includes the saved customer details, quote reference, payout, key count, and
quote summary, with extra pages for long summaries. Rejection emails have no attachment.
Both actions send directly from the admin without opening a mail app or downloading files.
Configure these server environment variables:

```text
RESEND_API_KEY=your_resend_api_key
RESEND_FROM="I Buy Car Keys <quotes@your-verified-domain.com>"
# Optional copy of each customer email:
ADMIN_EMAIL=admin@example.com
```

Use a Resend API key with sending permission and a sender address on a domain verified in Resend.
For local development, set these in `.env` and restart the dev server after changing them.

For the live Netlify site, add the variables under **Project configuration > Environment variables**.
Include the **Functions** scope and the **Production** deploy context, then redeploy the site.
The local `.env` file is ignored by Git, and variables in `netlify.toml` are not available to
serverless functions. See [Netlify's function environment variable documentation](https://docs.netlify.com/build/functions/environment-variables/).

If email sending fails, the quote status remains saved. After fixing the email configuration,
click **Approve** or **Reject** again for the same quote to retry its email. Repeating the same
status does not adjust inventory again.

## Contact emails

Contact emails use the same `RESEND_API_KEY` and `RESEND_FROM` settings as quote emails.
Set `ADMIN_EMAIL` to the inbox that should receive new-message alerts, with the Netlify
**Functions** scope and **Production** context. Redeploy after changing these settings.

After a contact submission is saved, the server sends an alert to `ADMIN_EMAIL`, with the
customer's address as Reply-To and a link to the admin dashboard. A notification failure
does not discard the saved message; check the Netlify function logs for the failure reason.
Contact alerts no longer use Netlify Forms notifications.

The contact endpoint checks a hidden text honeypot and rejects HTML or links in names,
names over 100 characters, and phone numbers over 50 characters before saving or emailing.
International names and links in the message body are allowed. These checks reduce basic
bot spam; they do not identify every marketing submission. Existing messages are retained.

In **Admin > Contact form**, click **Reply**, enter your response, and choose **Send reply**.
The server uses the saved contact's email address, includes the original message, and marks
the message as **replied** only after Resend accepts the email. Opening or closing the draft
does not change its status. If `ADMIN_EMAIL` is set, it receives a copy of the reply and is
used as the Reply-To address so customer follow-ups reach your inbox.

Failed sends leave the draft editable. Retrying an identical reply uses Resend's idempotency
key to avoid duplicates within its 24-hour window. If sending succeeds but saving the status
fails, the admin shows a warning without claiming the email failed. No database migration
is required for this integration.

In **Admin > Contact form**, choose **Delete** on a message and confirm to permanently
remove it. Only authenticated admins can delete messages. The list and counts update after
the server confirms deletion; failed deletes leave the message available to retry.

## 📂 Project Structure

Inside of your HyperDrive project, you'll see the following folders and files:

```text
/
├── public/
│   └── favicon.svg
├── src/
│   ├── assets/
│   ├── components/
│   ├── layouts/
│   │   └── Layout.astro
│   ├── pages/
│   │   ├── index.astro
│   └── styles/
└── package.json
```

## 📄 Premade Pages

-   Home
-   Cars
-   Blog
-   Contact
-   About Us
-   Services
-   404

## 🛠️ Quick start

To start adding your cars, go to /content/cars and add your car data in a markdown (.mdx) file. Each car should have a unique slug, title, and other relevant details like price, description, and images. Refer to the `example.mdx` file or any of the existing car examples for the required structure.

## 👀 Stuck?

If you have any questions or need help with HyperDrive, feel free to reach out to me at info@wpinfusion.com, or open an issue on the [HyperDrive GitHub repository](https://github.com/wpinfusion/astro-hyperdrive)
