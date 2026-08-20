# AWS EC2 deployment

## 1. Provision and secure the instance

Use Ubuntu 22.04+ with a security group that permits SSH (restricted to your IP), HTTP and HTTPS. Attach an Elastic IP and point your domain at it if you have one. Install Node.js 20 LTS, Nginx and PM2.

## 2. Install the application

Clone this repository to `/opt/civicroute`, then run `npm ci` in both `backend` and `frontend`. Build the web app with `VITE_API_URL=/api npm run build` in `frontend`, and copy `frontend/dist` to `/var/www/civicroute`.

Create `/opt/civicroute/backend/.env` with restrictive permissions (`chmod 600`). Set `GROQ_API_KEY`, a long random `ADMIN_API_KEY`, `CORS_ORIGIN=https://your-domain`, and `CIVICROUTE_DATA_PATH=/var/lib/civicroute/data.json`. Create `/var/lib/civicroute` and make it writable by the deployment user. Never put either secret in a Vite variable or commit it.

## 3. Run the API and reverse proxy

Copy `deploy/ecosystem.config.cjs` to the server or run it from the checkout: `pm2 start deploy/ecosystem.config.cjs && pm2 save`. Copy `deploy/nginx-civicroute.conf` into `/etc/nginx/sites-available/civicroute`, replace `YOUR_DOMAIN_OR_EC2_IP`, enable it, test with `sudo nginx -t`, and reload Nginx.

For a domain, obtain TLS with `sudo certbot --nginx -d your-domain`; then test `/api/health`, submission, tracking, and a restart of the EC2 instance. Configure a daily backup of `/var/lib/civicroute/data.json` before public use.

## Operations notes

The JSON store is appropriate for a single PM2 process and a single EC2 instance. Do not run clustered API workers against it. For multi-instance scale, migrate the persistence adapter to PostgreSQL and keep uploaded images in S3 or another private object store.
