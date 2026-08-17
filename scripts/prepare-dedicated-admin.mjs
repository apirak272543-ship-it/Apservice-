import fs from 'node:fs';

const source = fs.readFileSync('index.html', 'utf8');
const scopeStyle = `
  <style id="dedicated-admin-scope-style">
    /* Dedicated Admin App keeps the production Admin DOM/runtime intact while excluding customer UI. */
    html[data-app-scope="admin"] #view-home,
    html[data-app-scope="admin"] #view-register,
    html[data-app-scope="admin"] #view-stores,
    html[data-app-scope="admin"] #view-storefront,
    html[data-app-scope="admin"] #view-errand,
    html[data-app-scope="admin"] #view-ride-booking,
    html[data-app-scope="admin"] #view-orders,
    html[data-app-scope="admin"] #view-profile,
    html[data-app-scope="admin"] #view-marketplace,
    html[data-app-scope="admin"] #view-listing-detail,
    html[data-app-scope="admin"] #view-listing-create,
    html[data-app-scope="admin"] #view-marketplace-profile,
    html[data-app-scope="admin"] #view-marketplace-chat,
    html[data-app-scope="admin"] #registerButton,
    html[data-app-scope="admin"] #profileButton,
    html[data-app-scope="admin"] .brand-tag {
      display: none !important;
    }

    html[data-app-scope="admin"] .brand { cursor: pointer; }
    html[data-app-scope="admin"] #view-admin { min-height: calc(100dvh - 160px); }
    html[data-app-scope="admin"] #adminButton { display: grid !important; }
    html[data-app-scope="admin"] #view-login[data-dedicated-admin-login="true"] .login-card {
      max-width: 460px;
      border: 1px solid #bce8e0;
      box-shadow: 0 18px 48px rgba(5, 83, 74, .12);
    }
    html[data-app-scope="admin"] #view-login[data-dedicated-admin-login="true"] .login-card::before {
      content: 'AP SERVICE · ADMIN CONSOLE';
      display: block;
      margin-bottom: 12px;
      color: #087368;
      font-size: 10px;
      font-weight: 950;
      letter-spacing: .12em;
    }
    html[data-app-scope="admin"] #view-login[data-dedicated-admin-login="true"] #loginSubmit {
      min-height: 48px;
      margin-top: 18px !important;
    }
    @media (max-width: 720px) {
      html[data-app-scope="admin"] .topbar { position: sticky; }
      html[data-app-scope="admin"] #view-admin .section-head > div:last-child { width: 100%; }
    }
  </style>`;

const bootstrap = '\n  <script src="./admin-dedicated-bootstrap.js?v=dedicated-admin-runtime-v2"></script>';

let adminApp = source.replace('<html lang="th">', '<html lang="th" data-app-scope="admin">');
adminApp = adminApp.replace('</head>', `${scopeStyle}\n</head>`);
adminApp = adminApp.replace('</body>', `${bootstrap}\n</body>`);
adminApp = adminApp.replace('<title>AP Service | Delivery made simple</title>', '<title>AP Service | Dedicated Admin Application</title>');

if (!adminApp.includes('dedicated-admin-scope-style') || !adminApp.includes('admin-dedicated-bootstrap.js')) {
  throw new Error('Dedicated admin runtime injection failed');
}

fs.writeFileSync('admin.html', adminApp);
console.log('Dedicated Admin App built from full production Admin runtime.');
