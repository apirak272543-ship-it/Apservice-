# AP Service Page/Route Manifest

> Manifest นี้เป็น target architecture สำหรับ staged migration; links ปัจจุบันที่ยังเป็น monolith/compatibility entry ถูกระบุชัดว่าเป็น fallback ไม่ใช่ MPA final state

## Customer Application

| Target route | Responsibility | Page-specific data/services | Must not load |
|---|---|---|---|
| `/customer/index.html` | Home, discovery, promotions | public stores/promotions, lightweight location | Admin/Merchant/Rider runtimes |
| `/customer/stores.html` | Store discovery/search | stores, categories, availability | Admin tools, settlement/rider modules |
| `/customer/store.html?id=` | Storefront/products | one store, menu, cart API | all Admin patches |
| `/customer/checkout.html` | Checkout/payment submission | cart, delivery quote, payment config | merchant/rider management |
| `/customer/orders.html` | Order history/tracking | customer orders/status/notifications | internal finance/Admin tools |
| `/customer/profile.html` | Profile/wallet/settings | own profile, wallet, consent | other customers/admin data |

## Admin Application

| Target route | Responsibility | Page-specific data/services |
|---|---|---|
| `/admin/login.html` | Supabase Auth + admin role check | Auth/session only |
| `/admin/dashboard.html` | pending work, dashboard | cached badges then background summary refresh |
| `/admin/orders.html` | order operations | orders + status events, lazy filters |
| `/admin/stores.html` | store/merchant management | stores, menus, owner roles |
| `/admin/customers.html` | customer and wallet management | profiles/wallet transactions |
| `/admin/riders.html` | rider applications/operations | rider profiles/applications/earnings |
| `/admin/finance.html` | settlements/withdrawals/payment slips | finance scopes and proof viewer |
| `/admin/notifications.html` | notification operations | recipient-scoped notification admin tools |
| `/admin/ai-workspace.html` | AI Collaboration Workspace | AI workspace tables only |
| `/admin/settings.html` | central configuration control plane | `platform_configs` + server/RLS validation |

## Merchant Application

| Target route | Responsibility | Page-specific data/services |
|---|---|---|
| `/merchant/login.html` | store-owner authentication | Auth/role/store ownership |
| `/merchant/dashboard.html` | store summary | own-store metrics |
| `/merchant/orders.html` | accept/prepare order workflow | own-store orders + status transition contract |
| `/merchant/menu.html` | menu and stock | own store menu/categories/media |
| `/merchant/store.html` | profile/opening hours/location | own store record/media/location |
| `/merchant/finance.html` | sales/settlements/withdrawals | own settlement/wallet data |
| `/merchant/settings.html` | local store preferences | own profile only |

## Rider Application

| Target route | Responsibility | Page-specific data/services |
|---|---|---|
| `/rider/login.html` | rider authentication | Auth/role/rider profile |
| `/rider/dashboard.html` | current workload | own/eligible jobs cache |
| `/rider/jobs.html` | available/current jobs | delivery orders, central transitions |
| `/rider/delivery.html?id=` | active delivery/navigation | one permitted order + location |
| `/rider/earnings.html` | earnings/wallet/withdrawals | own earnings/settlements |
| `/rider/profile.html` | availability/profile | own rider profile/location |
| `/rider/settings.html` | app settings/help | own client preferences |

## Page Loading Rules

1. Navigation starts document/UI transition immediately; it does not await network.
2. Protected page checks session/role first, then displays a Thai loading/skeleton state while page data loads.
3. On unauthorized or expired session, clear the private view and redirect to that client’s login page.
4. Route-specific JavaScript may depend on `shared/ap-service-core.js` and shared services only; it must not import unrelated client UI code.
