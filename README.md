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
