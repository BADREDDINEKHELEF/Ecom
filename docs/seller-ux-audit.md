# ShopDZ Seller Experience Audit & Redesign Spec
**Platform:** ShopDZ — Algerian multi-niche e-commerce (cars, animals, kids)  
**Audit Date:** June 2026  
**Goal:** Make ShopDZ the best seller experience in Algeria — better than Jumia DZ, Shopify, and Instagram sellers combined.

---

## CURRENT STATE SUMMARY

What exists today is a functional but thin MVP:
- Dashboard with KPIs and charts (read-only)
- Products CRUD (modal form, no variants, no bulk)
- Orders view (read-only — **sellers cannot even confirm orders**)
- Deliveries (Yalidine API + manual tracking, good foundation)
- Analytics (solid date-range reporting)
- Settings (basic store info)

**Critical gaps:** no order status management, no payout page, no inventory alerts, no messaging, no delivery credential setup UI, no returns workflow, no bulk operations, no mobile-optimized flows.

---

## 1. SELLER DASHBOARD

### Industry Standard

**Jumia DZ:** Table-heavy. Sellers see a dense list of pending orders and revenue numbers. No urgency signals. Mobile unusable — horizontal scroll everywhere. No action hierarchy.

**Shopify:** Clean card grid with GMV, orders, sessions. Good trend indicators. But optimized for digital-first western merchants — doesn't account for COD reconciliation, wilaya delivery patterns, or the reality that your seller may have 40 unconfirmed orders expiring in 2 hours.

**Instagram DMs:** Zero dashboard — sellers manually track everything in their head or in a notebook. This is who we're stealing from.

### What 10x Looks Like for a Seller in Oran

The dashboard is not an information page. It is a **work queue with context**. Every element answers one question: *what do I need to do right now, and why?*

#### Layout (mobile-first, single column stacking to 2-col on tablet)

**Greeting header:**
```
Bonjour Karim 👋  —  Mercredi 4 juin 2026
[Store name pill] [Vacation mode toggle]
```
The name is personalized. The date is there because many sellers lose track of time. The vacation toggle is top-level because it's urgent when needed.

**Urgency strip (red/orange bar, always first):**
Appears only when action is required. Never shows when everything is fine.
```
⚠️  3 commandes non confirmées depuis +2h  →  Confirmer maintenant
```
Logic: if any order has been in `pending` status > 2 hours with no action, this strip appears. Tap goes directly to the filtered order list. Color: orange at 2h, red at 4h. At 6h: SMS sent to seller's phone.

This single feature eliminates the #1 seller failure mode: forgetting to confirm orders until buyers complain.

**4 KPI cards (2×2 grid):**

| Card | Primary value | Secondary |
|------|--------------|-----------|
| Aujourd'hui | Revenue DZD | ↑/↓ vs yesterday |
| Cette semaine | Revenue DZD | ↑/↓ vs last week |
| En attente de paiement | DZD amount | X commandes |
| Stock critique | X produits | Tap to view list |

Design: large number (Inter Black 28px), label below (14px gray), trend badge top-right (green up arrow or red down arrow + %). Never show percentage without direction arrow. Card tap navigates to relevant filtered view.

**Quick Actions bar (horizontal scroll, 3 visible):**
```
[+ Ajouter produit]  [Imprimer étiquettes (5)]  [Voir commandes]
```
- "Imprimer étiquettes" shows count of unprinted labels. Badge turns orange if >0.
- These must be reachable in **one tap from any screen** — put them in the bottom FAB on mobile too.

**Pending orders feed (replaces static "recent orders" table):**
This is the heart of the dashboard. Not a table — a card feed.

Each card:
```
┌──────────────────────────────────────────────┐
│  #1234  ·  Fatima B.  ·  Oran               │
│  Nike Air Max × 2  +  1 autre article       │
│  12,500 DA  ·  Paiement: Espèces à livraison │
│                                              │
│  ⏱ Reçue il y a 47 min                      │
│  [✅ Confirmer]          [❌ Annuler]        │
└──────────────────────────────────────────────┘
```

- Color-coded left border: blue = new (<1h), orange = aging (1-4h), red = urgent (>4h)
- "Confirmer" tapped: inline optimistic update, card slides out with success animation, count badge on tab decrements
- No modal, no navigation — action happens in-place
- This alone is the biggest UX improvement over the current read-only orders page

**Today's metrics strip:**
```
📦 Expédiées: 8   ✅ Livrées: 12   ↩️ Retours: 1   💬 Messages: 3 non lus
```
Horizontal icon row. Tappable — each navigates to filtered view.

**Low stock alert section (conditional):**
Only shows if products with stock ≤ threshold exist.
```
⚠️ Stocks faibles
  [Product photo] Chaussure Nike T42 — 2 restants  [Réapprovisionner →]
  [Product photo] Sac Cuir Marron — 0 restants     [Désactiver →]
```

**Top product of the week:**
```
🏆 Meilleur produit cette semaine
[photo] Robe Kabyle Brodée
32 ventes · 48,000 DA de revenus
[Booster ce produit →]
```

**Payout balance card (bottom):**
```
💰 Solde disponible: 34,500 DA
Prochain virement: dimanche 8 juin
[Demander un virement anticipé →]
```

#### States to implement
- **Empty state (new seller):** Illustrated onboarding checklist, not blank dashboard. "Votre boutique est prête. Ajoutez votre premier produit →"
- **Loading state:** Skeleton cards matching exact layout — no layout shift
- **Error state:** "Impossible de charger vos données. [Réessayer]" — never a blank white screen
- **All caught up state:** Green "Tout est à jour ✓" banner when no pending orders, no stock alerts

---

## 2. PRODUCT LISTING EXPERIENCE

### Industry Standard

**Jumia Seller Center:** One long form. No guidance. Arabic/French not supported simultaneously. Mobile: nightmare scrolling through 30+ fields. Images require external hosting URL — most sellers don't know what a URL is.

**Shopify:** Best-in-class form UX but designed for English-speaking tech-literate merchants. Variant matrix is good. Image upload is drag-and-drop. But zero local context: no Algerian categories, no DZD-aware pricing guidance.

**Instagram sellers:** Post a photo, write a caption, wait for DMs. No structure at all. This is 60% of our competition.

### What 10x Looks Like

#### Mobile-first form architecture

Most Algerian sellers will list from a **Samsung A-series or Tecno phone**. The form must work perfectly with a soft keyboard covering half the screen.

**Step-based form (not one long scroll):**
```
Étape 1 de 4: Informations  ●○○○
Étape 2 de 4: Photos        ○●○○
Étape 3 de 4: Prix & Stock  ○○●○
Étape 4 de 4: Livraison     ○○○●
```

Progress dots at top. Each step has a "Continuer" button fixed at the bottom (above keyboard). Draft auto-saves every 30 seconds — "Sauvegardé ✓" appears briefly in top-right.

**Step 1 — Informations:**

*Titre du produit:*
- Large text input, placeholder: "ex: Robe Kabyle brodée bleu marine T38"
- Character counter: `32/100`
- Below input, if seller pauses for 3 seconds: AI suggestion chip appears
  ```
  💡 Suggestion: "Robe Kabyle Brodée Main — Bleu Marine — Taille 38"
     [Utiliser] [Ignorer]
  ```
  AI title generation: calls `/api/seller/ai/title` with category + raw input, returns SEO-optimized title in French. Non-blocking — appears as a suggestion, never overwrites.

*Catégorie:*
- Large icon grid, not a dropdown. First level: cars / animals / kids
- Second level chips appear below based on first selection
- Dynamic fields load based on category (kids → age range; cars → brand/year; animals → species/age)
- Never show irrelevant fields

*Description:*
- Textarea with formatting toolbar: Bold / List / Emoji
- Below: "✨ Générer avec l'IA" button
  - Modal opens: "Décrivez votre produit en quelques mots (en français ou darija)"
  - Input: "robe kabyle bleu brodée main taille 38 bonne qualité"
  - Generates 3-language description (FR/AR/EN tabs)
  - Seller reviews each, edits if needed, confirms
  - This eliminates the #1 barrier for non-literate sellers

**Step 2 — Photos:**

*Upload widget:*
```
┌─────────────────────────────────┐
│   📷  Ajouter des photos        │
│                                 │
│   Galerie    Appareil photo     │
│                                 │
│   Glisser-déposer ici           │
└─────────────────────────────────┘
```
- On mobile: two big buttons (Galerie / Appareil photo) — no drag-and-drop since no mouse
- Multiple selection from gallery (tap to select, checkmark appears)
- Upload progress: circular spinner per image, then thumbnail
- First photo = cover photo (labeled "Photo principale")
- Drag to reorder on desktop, long-press drag on mobile
- **Photo quality checker** (runs client-side after upload):
  - Blur detection: too blurry → orange warning "Photo floue — les acheteurs risquent de ne pas l'acheter"
  - Resolution check: < 400px → "Photo trop petite"
  - Watermark detection (basic: if image has semi-transparent overlay text patterns) → "Filigrane détecté — les acheteurs n'aiment pas les filigranes"
  - These are warnings, not blockers. Seller can publish anyway.
- **Background removal:** Server-side (remove.bg API or rembg). Toggle: "Fond blanc automatique". Processes asynchronously, original kept as fallback. Adds professional look without photoshoot.

**Step 3 — Prix & Stock:**

*Prix:*
- Large number input, DZD suffix always visible
- Below: "Les produits similaires se vendent entre 2,500 DA et 8,000 DA" (pulled from category median prices)
- Compare price (optional): "Prix barré" — shows ~~5,000 DA~~ 3,500 DA on listing
- When compare price > regular price: warning "Le prix barré doit être supérieur au prix de vente"

*Variantes:*
This is where current implementation completely fails. Modal form has no variant support.

New flow:
- Toggle: "Ce produit a des variantes (tailles, couleurs, etc.)"
- When ON: variant builder appears
  ```
  Option 1: [Taille ▼]  Valeurs: [36] [37] [38] [39] [40] [+ Ajouter]
  Option 2: [Couleur ▼] Valeurs: [Bleu ●] [Rouge ●] [Noir ●] [+ Ajouter]
  ```
  Color option shows color picker. Size option shows common size scales (EU, US, UK, FR) to auto-populate.
  
  "Générer les variantes →" button creates the matrix:
  ```
  Taille 36 / Bleu   Prix: [3,500] DA   Stock: [5]   SKU: [auto]
  Taille 36 / Rouge  Prix: [3,500] DA   Stock: [3]   SKU: [auto]
  Taille 37 / Bleu   Prix: [3,500] DA   Stock: [8]   SKU: [auto]
  ...
  ```
  Bulk fill: "Appliquer ce prix à toutes les variantes" saves enormous time.
  Individual variant rows editable inline.

*Stock:*
- Stepper (- number +) with large touch targets (min 44px)
- Low stock threshold: "M'alerter quand le stock est inférieur à [5] unités"
- "Date de réapprovisionnement prévue" datepicker (optional — shows to buyers)

**Step 4 — Livraison:**

- Wilayas desservies: toggle "Toute l'Algérie" or select specific wilayas
- Wilaya grid: 58 wilayas in a searchable checkbox grid, grouped by region (Nord, Centre, Est, Ouest, Sud)
- Frais de livraison: "Gratuit" / "Fixe" / "Par wilaya"
  - If "Par wilaya": spreadsheet-style table with 58 rows, bulk fill available
- Délai de traitement: same day / 1 day / 2-3 days / custom

**Scheduled listings:**
- "Mettre en ligne automatiquement le" datepicker + time selector
- Preview: "Votre produit sera visible à partir du lundi 1er juillet à 09h00"
- Perfect for Ramadan/Eid prep — seller builds catalog in advance

**Draft mode:**
- Always available: "Enregistrer comme brouillon" ghost button in every step
- Dashboard shows draft count: "3 produits en brouillon"

**Duplicate product:**
- On product card 3-dot menu: "Dupliquer"
- Opens edit form pre-filled with all data except title (appends " — Copie")
- Draft by default until seller publishes

**Bulk upload:**
- "Importer via Excel" button on products page
- Download template button first (pre-formatted with all required columns)
- Upload CSV/XLSX → validation table shows each row as green (valid), orange (warning), red (error)
- Partial import: import only valid rows, skip errors
- Column mapping UI: if column names don't match exactly, drag to re-map

**SEO preview:**
- Below description: collapsible "Aperçu dans les recherches"
  ```
  Robe Kabyle Brodée Main — Bleu Marine — Taille 38 | ShopDZ
  https://shopdz.dz/kids/produit-1234
  Description du produit tronquée après 160 caractères ici dans cet aperçu...
  ```
- Character count bars for title and description with SEO thresholds marked

---

## 3. ORDER MANAGEMENT

### Industry Standard

**Jumia:** Kanban exists but is clunky. Bulk label print works but requires desktop. No in-platform courier booking — you call Yalidine manually.

**Shopify:** Best fulfillment UX on the market. Bulk fulfill, auto-tracking injection, carrier calculated rates. But built for international shipping, not COD + 58-wilaya Algeria.

**Current ShopDZ:** Fatal flaw — sellers cannot change order status. Orders page is read-only. A seller cannot confirm, ship, or cancel from the dashboard. This is unusable.

### What 10x Looks Like

#### View modes

**Kanban (default on desktop):**
Columns: `Nouvelle (3)` → `Confirmée (7)` → `Étiquette imprimée (2)` → `Ramassage` → `En transit` → `Livrée` → `Retournée`

Each card: buyer name + wilaya + amount + product thumbnail. Drag-and-drop between columns updates status instantly (optimistic update + API call). Mobile: columns collapse to single active column with swipe navigation.

**List (default on mobile):**
Sortable by: date (default), wilaya, amount, status. Filter chips above list: `Toutes` `Nouvelles` `En attente` `Expédiées`. Search bar: searches buyer name, phone, wilaya, product, order ID.

Each row:
```
#1234  Karim B.  ·  Tizi Ouzou       12,500 DA   [En attente ▼]
       Nike Air × 2                  il y a 2h   [⋯ Actions]
```
- Status is a tappable dropdown — change status inline
- Color-coded by urgency: white (new, <1h), light orange (1-4h), orange (4-8h), red (>8h)

#### Order status transitions

Valid state machine (enforced in UI — buttons only appear for valid next states):
```
Nouvelle → Confirmée → Étiquette imprimée → En ramassage → En transit → Livrée
                 ↓                                                         ↓
             Annulée                                                   Retournée
```

Confirming an order: tap → modal with:
- Buyer info + items summary
- "Confirmer commande" button
- Option: "Envoyer SMS de confirmation" toggle (ON by default)
- On confirm: SMS sent "Votre commande #1234 a été confirmée par [Store]. Vous serez contacté(e) pour la livraison."

#### Bulk actions

Select orders with checkbox (or "Tout sélectionner"):
```
[12 sélectionnées]  [Confirmer]  [Imprimer étiquettes]  [Exporter CSV]  [Annuler]
```

**Batch label print:**
- Select 1-50 orders → "Imprimer étiquettes (20)"
- Modal: select printer format (58mm thermal / 80mm thermal / A4 × 4 labels)
- Select courier if not assigned yet
- Generates one PDF → browser print dialog opens
- Labels include: order ID (barcode/QR), buyer name, phone, full address, wilaya, seller name, COD amount
- After print: "Marquer comme imprimées" auto-moves to "Étiquette imprimée" status

**Yalidine bulk dispatch:**
If seller has Yalidine credentials saved:
- Select orders → "Créer expéditions Yalidine (12)"
- Progress modal: each order gets a tracking number, shows success/error per row
- Auto-updates tracking number in order record
- Prints labels immediately after

**ZR Express / Maystro / Noest:**
Currently no API integration. Spec for future:
- Until native API: "Télécharger CSV pour [Maystro]" — generates their specific import format
- Seller uploads to Maystro portal, pastes tracking numbers back in bulk via "Import suivi" tool

#### Order detail page

Tap any order → full-screen detail (not modal — full page, mobile-friendly):

```
Commande #1234  ·  il y a 3h
Status: [En attente de confirmation ▼]

CLIENT
  Karim Benali  ·  +213 6xx xxx xxx  (visible after confirm)
  Tizi Ouzou, Cité Nouvelle, Apt 12

ARTICLES
  [photo] Nike Air Max T42  ×1     8,500 DA
  [photo] Chaussettes Nike  ×2     1,000 DA
  ─────────────────────────────────────────
  Livraison (Tizi Ouzou)           650 DA
  TOTAL                         10,150 DA
  Méthode: Paiement à la livraison (COD)

EXPÉDITION
  [Créer expédition →]  (if not shipped yet)
  or
  Coursier: Yalidine
  Suivi: YAL-2024-XXXXX  [Copier] [Voir suivi →]

NOTES VENDEUR (private, buyer can't see)
  [Textarea] "Emballage fragile, attention"

ACTIONS
  [✅ Confirmer]  [🖨 Imprimer étiquette]  [📦 Créer expédition]
  [❌ Annuler]    [↩️ Traiter retour]
```

#### COD reconciliation

New section in Orders page: "Remises COD"

Yalidine and ZR Express remit COD cash to sellers after delivery. Current system has zero tracking of this.

```
REMISES EN ATTENTE
  Yalidine — Semaine 22:  34,500 DA en attente  [Marquer comme reçu]
  ZR Express — Mai 2026:  12,000 DA en attente  [Marquer comme reçu]

HISTORIQUE
  Yalidine — Semaine 21:  28,000 DA  ✓ Reçu le 01/06
```

Seller marks remittance received manually (or auto-detected if integrated with courier API). Platform calculates expected amount = sum of COD delivered orders not yet remitted.

#### Return handling

When courier marks order as "returned", seller sees it in Retournée column.

Return workflow:
1. Card shows: "Retour reçu" — "Avez-vous reçu l'article physiquement ?"
2. Seller taps "Oui, reçu" → selects reason: Refus / Absent / Mauvaise adresse / Produit défectueux
3. If "Produit défectueux": upload photo required, platform logs for dispute
4. Stock auto-restocked if "Refus" or "Mauvaise adresse"
5. No refund to buyer (COD = no refund owed, buyer didn't pay in advance)
6. Platform fee refund: if delivered=false → no commission charged (deducted from next settlement)

---

## 4. INVENTORY MANAGEMENT

### Industry Standard

**Jumia:** Basic stock field per product, no alerts. When stock hits 0, listing auto-pauses. No variant-level tracking. No bulk update.

**Shopify:** Excellent. Variant-level stock, location-based inventory, transfer orders, adjustment history. Overkill for most Algerian sellers but the UX patterns are worth copying.

**Current ShopDZ:** Stock is a number on a product. No alerts, no history, no bulk update, no reservation system.

### What 10x Looks Like

#### Inventory table (dedicated page: `/seller/inventory`)

Not the products page — a focused tool just for stock numbers:

```
[Search products...]  [Filtre: Stock critique ▼]  [Modifier en masse]

Produit                    Seuil   Stock actuel   Réservé   Disponible
Nike Air Max T40             5        0            0           0       ⛔ Rupture
Nike Air Max T42             5        3            1           2       🟠 Critique
Nike Air Max T44             5        12           2           10      🟢 OK
Robe Kabyle Bleue T38        3        45           5           40      🟢 OK
```

- Color coding: red (0), orange (≤ threshold), green (> threshold)
- Inline edit: tap stock number → editable input, Enter to save
- Reserved = orders confirmed but not yet shipped (soft reserve)
- Available = stock - reserved

**Bulk update:**
Select multiple rows → "Modifier le stock" → modal with simple adjustment:
```
Ajouter: [+] [50] [+]
Ou définir: [_____]
[Appliquer à 5 produits sélectionnés]
```

Reason field for audit trail: "Réapprovisionnement", "Correction inventaire", "Retour client"

**Low stock alerts:**
Threshold configurable per product (default: 5). When reached:
- Dashboard alert card appears
- Push notification to seller: "⚠️ Nike Air Max T42 — plus que 2 en stock"
- Optional: auto-pause listing at 0 (toggle per product)

**"Notify when back in stock" for buyers:**
When listing is paused due to 0 stock, buyer sees:
```
Rupture de stock
[🔔 Me notifier quand disponible]  ← stores their phone/email
```

Seller sees in inventory table: "3 personnes attendent ce produit" → motivates restocking.

**Restock date:**
```
Date de réapprovisionnement prévu: [01/07/2026]
```
When set, shows on product page: "Disponible à partir du 1 juillet"

**Stock history chart (per product):**
Tab in product edit modal: "Historique du stock"
Line chart: stock level over 30 days. Events marked: "Vente × 2", "Retour +1", "Réappro +50". Helps seller understand velocity.

**Overstocking alert:**
Weekly insight on dashboard: "Vous avez 8 produits avec 0 vente en 30 jours et un stock élevé. [Voir →]"
Each flagged product gets suggested action: "Créer une promotion" or "Réduire le prix".

**Reservation system (background logic):**
- Order placed (status=new): soft-reserve stock units
- Order confirmed: reserve maintained
- Order shipped: reserve cleared, stock decremented
- Order cancelled/refused: reserve released, stock restored
- Prevents overselling during high-demand flash sales

---

## 5. MULTI-STORE MANAGEMENT

### Industry Standard

**Shopify:** Multiple stores require separate accounts + plans. No native cross-store view.

**Jumia:** One seller account, multiple shops not supported.

**Current ShopDZ:** One vendor account = one store. No multi-store.

### What 10x Looks Like

This is a **major differentiator** — no Algerian platform offers true multi-store under one account.

#### Store switcher

Top-left of sidebar:
```
┌─────────────────────────────────┐
│  [logo] Mode Jardin         ▼   │
│  ──────────────────────────     │
│  ● Mode Jardin (active)         │
│  ○ Électronique DZ              │
│  ○ Accessoires Mode             │
│  + Créer une nouvelle boutique  │
└─────────────────────────────────┘
```
Color-coded dot per store (assigned on creation). Max 2 clicks to switch.

#### "All Stores" consolidated view

When no store is selected (dropdown shows "Toutes mes boutiques"):
```
TABLEAU DE BORD CONSOLIDÉ
  GMV total:     485,000 DA  ↑12% vs semaine dernière
  Commandes:     34 en attente (toutes boutiques)
  Solde payout:  78,500 DA
  
  Mode Jardin        ████████████  285,000 DA  ↑18%
  Électronique DZ    ████████      145,000 DA  ↑5%
  Accessoires Mode   ████          55,000 DA   ↓3%
```

Drill down: tap any store row to enter that store's dashboard.

#### Store isolation

Each store has independent:
- Product catalog
- Order queue
- Analytics
- Payout bank account
- Team members (owner can invite staff per store)
- Branding (logo, banner, description, color theme)
- Commission rate (negotiated individually with platform)

#### Cross-store operations

**Product transfer:**
3-dot menu on product → "Copier dans une autre boutique"
Opens modal: select destination store. Copies all data, no re-entry. Arrives as draft.

**Shared buyer blocklist:**
If a buyer causes issues in one store (fraud, repeated refusals):
- Seller blocks them: "Bloquer cet acheteur"
- Propagates to all stores owned by same seller
- Blocked buyer sees: "Cette boutique n'accepte pas votre compte pour le moment"

**Vacation mode per store:**
Toggle per store independently. One store on vacation doesn't affect others.
When ON: all listings show "En pause — boutique en congé" with optional return date.

#### Staff accounts (per store)

Owner can invite:
- **Gestionnaire:** full access except payout settings
- **Traitement commandes:** orders + deliveries only (not products, not analytics)
- **Lecture seule:** view everything, change nothing

Staff see same dashboard but without financial data unless authorized.

---

## 6. PRICING & PROMOTIONS TOOLS

### Industry Standard

**Jumia:** Promotions require submitting a request to Jumia team — slow, no control.

**Shopify:** Excellent discount codes, automatic discounts, gift cards. But no flash sale countdown native, no DZD-specific tools.

**Instagram sellers:** WhatsApp "code promo RAMADAN" — completely untracked.

### What 10x Looks Like

#### Promo code builder

`/seller/promo` — full builder, not just a field:

```
Type de réduction:
  ○ % de réduction     [20] %
  ● Montant fixe       [500] DA
  ○ Livraison gratuite
  ○ Produit offert     [Choisir le produit]

Restrictions:
  Commande minimum:    [2,500] DA
  Usage maximum:       [100] utilisations au total
  Usage par acheteur:  [1] fois
  Produits concernés:  [Tous] ou [Sélectionner produits]
  Wilayas:             [Toutes] ou [Sélectionner wilayas]
  Expiration:          [30/06/2026] à [23:59]

Code:
  [RAMADAN2026]  [Générer aléatoire]
  
[Enregistrer] [Créer et partager sur WhatsApp]
```

"Créer et partager" generates pre-formatted WhatsApp message:
> 🎁 Code promo exclusif : **RAMADAN2026**  
> 500 DA de réduction sur votre commande.  
> Valable jusqu'au 30/06/2026.  
> Commandez sur : shopdz.dz/shop/[slug]

**Batch unique codes (for influencers):**
- "Générer X codes uniques" — creates INFLUENCER001...INFLUENCER100
- CSV download
- Per-code analytics: which code generated how many orders
- "Codes partagés avec: [Yasmine Influencer, 2,340 abonnés]" — track performance per creator

#### Flash sales

Flash sale creator:
```
Produit: [Robe Kabyle Bleue T38]
Prix flash: [2,500] DA  (était 3,500 DA — soit -29%)
Stock limité: [20] unités
Début: [01/07/2026 09:00]
Fin:   [01/07/2026 18:00]
```

On product page during flash sale:
```
🔥 VENTE FLASH
⏰ Encore 3h 24min
████████░░  18/20 vendus
2,500 DA  ~~3,500 DA~~
```

Countdown timer (live, updates every second). Progress bar fills as stock sells. Urgency mechanics proven to increase conversion 30-40%.

Flash sales auto-disable at end time. Price reverts automatically.

**Bundle deals:**
```
Type: ○ Achetez X obtenez Y%  ● Lot fixe (X + Y = Z DA)

Produit A: [Robe Kabyle T38]    à [3,500 DA]
Produit B: [Ceinture Artisanale] à [800 DA]
Prix du lot: [3,800 DA]  (économie: 500 DA)
Label affiché: "Tenue complète — 500 DA d'économie"
```

Bundle shown on each product's page: "Complétez votre tenue" section.

**Ramadan/Eid campaign planner:**
Pre-built campaign types with suggested timing:
```
📅 Campagne Ramadan 2027
  Début: 28 jours avant Ramadan  (auto-calcul)
  Promo code: RAMADAN27
  Réduction: [15]%
  Produits: [Sélectionner catégorie: Tenues traditionnelles]
  
  ⏰ Rappel automatique la veille de l'Aïd:
     "Voulez-vous désactiver votre campagne Ramadan ?" [Oui] [Non, garder actif]
```

---

## 7. SELLER ANALYTICS

### Industry Standard

**Jumia Seller Center:** Revenue table, order count, basic charts. No funnel, no wilaya heatmap, no actionable insights. Numbers only — no "why" or "what to do."

**Shopify Analytics:** Excellent conversion funnel, session analytics, product performance. Zero Algeria-specific data (wilayas, COD rates).

**Current ShopDZ:** Solid foundation — revenue chart, donut charts, top products, wilaya bars, CSV export. Missing: funnel, CTR, actionable insights, "what to do next" suggestions.

### What 10x Looks Like

#### Analytics page structure

Tabbed: `Ventes` | `Produits` | `Livraison` | `Clients` | `Insights`

**Date range selector (persistent across tabs):**
```
[Aujourd'hui] [7j] [30j] [3 mois] [Année] [Personnalisé]
                                           ← [<] Mai 2026 [>]
```

---

**TAB: Ventes**

*KPI row (4 cards):*
Revenue / Orders / AOV (average order value) / Conversion rate
Each with: value + trend vs previous period (same duration) + sparkline

*Revenue area chart:*
Smooth curve, orange fill under line, navy line on top. Hover tooltip shows exact DZD + order count for that day. Toggle: daily / weekly / monthly view.

*Revenue breakdown donut:*
By payment method — COD vs BaridiMob vs CIB vs Virement. Quantifies how much COD dominates.

*Wilaya revenue heatmap:*
Algeria map SVG (all 48 wilayas). Color intensity = revenue. Hover shows: wilaya name + revenue + order count + avg basket. "Voir détail" expands to table.

---

**TAB: Produits**

*Conversion funnel (fix the biggest blind spot):*
```
Impressions dans recherche   12,450   100%
Clics sur produit             1,870    15%  ← CTR
Ajouts au panier                340    18%  ← Add-to-cart rate
Commandes passées               180    53%  ← Checkout rate
Commandes livrées               162    90%  ← Fulfillment rate
```

Each drop-off point shows a diagnostic:
- "15% CTR — En dessous de la moyenne (22%). Vos photos ou titre pourraient être améliorés."
- "18% add-to-cart — Normal. Vos prix sont compétitifs."
- "90% livraison — Excellent ! Très peu de refus."

*High view / low conversion alert:*
Flagged products table:
```
Robe Kabyle T38  →  845 vues, 0 ventes, 0 ajouts panier
Possible causes:
  • Prix supérieur à la moyenne de la catégorie (+40%)
  • Photos: seulement 1 photo (les acheteurs veulent en voir 3+)
  • Description vide
[Modifier ce produit →]
```

*Top products performance table:*
Columns: Product / Impressions / CTR / Add-to-cart% / Units sold / Revenue / Return rate
Sortable by any column. Flag column for high-return-rate products.

---

**TAB: Livraison**

*Delivery success rate by wilaya:*
Table: Wilaya / Orders / Delivered / Returned / Refused / Success%
Sort by success rate ascending → immediately shows problem wilayas.

Red flag rows: wilayas with >20% non-delivery. Platform insight: "Tizi Ouzou: 35% de refus. Cause probable: adresses incomplètes. Conseil: appeler le client avant expédition dans cette wilaya."

*Courier performance comparison:*
```
Yalidine   →  4.2j moyenne  ·  92% livraison  ·  3,450 DA remis (COD)
ZR Express →  5.8j moyenne  ·  78% livraison  ·  Remise manuelle requise
```

*COD cash-in-hand tracking:*
Timeline showing: order placed → delivered → remittance expected → remittance received.
Gap between "expected" and "received" = cash float owed by courier. Total floating amount shown prominently.

*"Expand here" geographic opportunity insight:*
```
💡 Opportunités non exploitées
   Béjaïa:  340 recherches de produits similaires aux vôtres ce mois,
            mais vous ne livrez pas là.
   Estimé: +45,000 DA/mois si vous activez cette wilaya.
   [Activer Béjaïa →]
```
This is calculated from platform-wide search data (anonymized) matched to seller's catalog.

---

**TAB: Clients**

*New vs returning buyers ratio* (donut)
*Repeat purchase rate:* X% of buyers ordered again within 60 days
*Top customers by lifetime value* (table, anonymized phone — last 4 digits only for privacy)
*Buyer wilaya distribution* (same heatmap as sales but customer count)
*Avg time between first and second purchase* (if > 90 days: "Pensez à une campagne de rétention")

---

**TAB: Insights (the differentiator)**

Weekly auto-generated narrative (in French, plain language):

```
📊 Résumé de votre semaine — 27 mai au 2 juin

Vos ventes ont augmenté de 23% cette semaine, principalement 
grâce à la Robe Kabyle Bleue (+45 ventes). 

⚠️ À surveiller: 3 produits ont un taux de retour >15%:
   → Chaussures T41: 3 retours (taille incorrecte probable)
   → Parfum Oud: 2 retours (non conforme à la description)

💡 Opportunité: Vous avez 0 stock sur Nike Air T42 avec 
   8 personnes en attente de réapprovisionnement.

🎯 Action recommandée cette semaine: 
   Mettez à jour vos photos de chaussures — produits avec
   3+ photos convertissent 2x mieux dans votre catégorie.
```

---

## 8. SELLER COMMUNICATION TOOLS

### Industry Standard

**Jumia:** No in-platform messaging. Communication through order notes only. Buyers/sellers share phone numbers → moves entirely to WhatsApp → platform loses visibility.

**Shopify:** No built-in customer messaging. Merchants use third-party apps (Tidio, Gorgias). Poor integration.

**Instagram sellers:** All in DMs. No structure. No order context. No history.

### What 10x Looks Like

The goal: keep conversations on-platform while feeling as natural as WhatsApp.

#### In-app messenger

Buyer initiates from: product page ("Poser une question") or order page ("Contacter le vendeur").

Seller sees in sidebar: **💬 Messages (3)** badge.

Conversation view:
```
← Messages

[Avatar] Karim B.                  il y a 12min
  Commande #1234 · Nike Air Max T42
  ─────────────────────────────────
  Bonjour, est-ce que la taille 42 
  correspond à un 42 européen ?
  
  [Oui, c'est bien du 42 européen ✓]    vous
  
  Merci beaucoup !                   Karim
  
  [_________________________________]  📎  ➤
  
  Réponses rapides:
  [Bonjour ! ✋] [En cours de traitement] [Votre suivi: _]
```

**Message tied to order:** when initiated from order page, order summary appears at top of conversation. Seller sees instantly what the buyer bought.

**Quick-reply templates:**
Seller pre-configures templates with variable slots:
```
Templates:
  "Bonjour [prénom] ! Votre commande #[ordre_id] est confirmée.
   Livraison prévue sous 48-72h à [wilaya]. Merci !"
   
  "Votre colis est en route ! N° de suivi: [tracking]. 
   Suivez ici: [tracking_url]"
```
Tap template → variables auto-filled from order context.

**Auto-reply when offline:**
```
Hors ligne jusqu'au [date]:
"Merci pour votre message ! Nous répondons dans les 
2 heures pendant nos horaires d'ouverture (9h-18h du 
lundi au vendredi). À bientôt !"
```

Business hours configurable. Out-of-hours messages get auto-reply.

**File attachments:**
Buyer can send photos of defective items. Seller can send size guides (PDF or image). Max 5MB per file.

**Response time indicator:**
Public on store page: "Répond généralement en 2h"
Calculated from 30-day average. Encourages fast replies.

**Broadcast messages (to store followers):**
Buyers who favorited the store or opted in to notifications can receive broadcasts.
```
Nouveau message pour vos abonnés:
[_________________________________]  (max 500 chars)
Envoyer à: [340 abonnés]
[Aperçu]  [Envoyer]
```
Hard limits: max 2 broadcasts per week per store. Unsubscribe link always appended. Opt-in required at follow time.

**WhatsApp Business API integration:**
Advanced feature (Phase 2):
- Seller connects WhatsApp Business number in settings
- Broadcasts sent via WhatsApp API to opted-in buyers
- Message templates pre-approved by Meta (in FR and AR)
- Platform handles the API key management — seller just writes the message

---

## 9. SELLER PAYOUTS

### Industry Standard

**Jumia:** Weekly payouts, complex commission structure, many hidden fees, no transparent breakdown per order. COD remittance tracked loosely.

**Shopify Payments:** Instant/next-day payouts in US/EU. Zero DZD/CCP support.

**Current ShopDZ:** Commission tracked in analytics but **no payout page exists at all**. Sellers have no idea when they get paid or how much.

### What 10x Looks Like

Transparency is the product. Show every centime.

#### Payout page (`/seller/payouts`)

**Balance summary (top, always visible):**
```
💰 Solde disponible
   78,500 DA
   
   Solde en attente (livraisons non confirmées): 23,000 DA
   
[Demander un virement maintenant]  (traitement 2 jours ouvrés)
Prochain virement automatique: dimanche 8 juin
```

"En attente" = COD orders delivered but remittance not yet confirmed from courier. Seller understands their total expected vs available.

**Per-order fee breakdown (the trust builder):**
Every transaction in the history table, expandable:
```
Commande #1234 — Livrée le 02/06           AFFICHER ▼
  Prix de vente:                     8,500 DA
  Frais de livraison:               -  650 DA  (supporté par acheteur)
  Commission plateforme (8%):       -  680 DA
  ─────────────────────────────────────────
  Votre part nette:                  7,170 DA
  Statut: ✅ Inclus dans le virement du 08/06
```

This eliminates all disputes about "why did I receive less than expected." Every line is explained.

**Payout history table:**
```
Date        Méthode      Montant    Statut        Commandes
08/06/26    CIB xxxx     45,200 DA  ✅ Reçu       23 commandes  [PDF]
01/06/26    CIB xxxx     38,700 DA  ✅ Reçu       18 commandes  [PDF]
25/05/26    CIB xxxx     52,100 DA  ✅ Reçu       27 commandes  [PDF]
```

[PDF] link downloads a payout statement (invoice format) suitable for accounting.

**Payout accounts:**
```
Comptes de virement enregistrés:
  🏦 CIB — BNP El Djazair **** 4521   ✅ Vérifié  [Principal]
  📱 BaridiMob — 200 1234 5678       ✅ Vérifié
  
[+ Ajouter un compte]
```

Verification: when adding a bank account, platform sends 2 micro-deposits (1-100 DA each), seller confirms the amounts to verify ownership. One-time process. CCP number validation (19-digit Algerian format). BaridiMob phone number validation.

**NIF threshold gating:**
When cumulative payouts approach 50,000 DA/month:
```
⚠️ Vous approchez du seuil légal (45,000 DA / 50,000 DA ce mois)
Pour continuer à recevoir vos virements au-delà de 50,000 DA/mois,
fournissez votre NIF (Numéro d'Identification Fiscale).
[Soumettre mon NIF →]
```

If NIF not submitted and threshold crossed: payouts held (not cancelled — held and released when NIF provided).

**Payout hold system:**
If return rate > 30% in 30 days: partial hold (50% of new settlements held for 30 days).
Seller notification:
```
⚠️ Retenue partielle activée
Votre taux de retour (32%) dépasse notre seuil de 30%.
50% de vos prochains virements seront retenus pendant 30 jours.
Pour lever cette retenue: amenez votre taux sous 25%.
Votre taux actuel: 32% · Objectif: < 25%
[Voir les commandes retournées →]
```

Clear path to resolution. No opaque "your account is under review."

**CSV export:**
```
[Exporter — Transactions] [Exporter — Résumé annuel]
```
Résumé annuel: yearly income summary in format compatible with Algerian tax declaration forms.

---

## 10. SELLER ONBOARDING & GROWTH

### Industry Standard

**Jumia:** Long approval process (days/weeks), requires physical document submission, zero guidance on listing quality.

**Shopify:** 14-day trial, excellent onboarding checklist, in-context help. But English-only, no Algeria-specific guidance.

**Instagram:** Zero onboarding. Just start posting.

### What 10x Looks Like

Goal: first sale within 48 hours of registration.

#### Onboarding flow

After email verification, seller arrives at a focused setup wizard (not the dashboard):

```
Bienvenue sur ShopDZ, Karim ! 🎉
Votre boutique est prête en 3 étapes.

  ✅  Étape 1 — Votre boutique
      Nom: Mode Jardin  ·  Lien: shopdz.dz/shop/mode-jardin
      [Modifier]
      
  ○   Étape 2 — Votre premier produit         ← current step
      Ajoutez un produit pour commencer à vendre.
      [Ajouter un produit →]
      
  ○   Étape 3 — Compte de paiement
      Pour recevoir vos virements.
      [Ajouter un compte →]
      
[Passer pour l'instant]  (gray, below — visible but not prominent)
```

Step 2 (first product) has inline tooltips visible in the form itself — not a separate help article:
- On photo upload: "Les produits avec 3+ photos se vendent 2x mieux. Conseil : fond blanc ou fond uni."
- On price: "Prix conseillé dans cette catégorie : entre 1,500 DA et 4,500 DA."
- On description: "Décrivez la matière, la taille, l'entretien. Les acheteurs veulent les détails."

After first product published: confetti animation + "Votre produit est en ligne ! Partagez-le." with WhatsApp share button.

**Progression visible at all times:**
Dashboard header (first 30 days):
```
Profil complété: ████████░░ 80%
Manque: Photo de profil · Politique de retour
[Compléter maintenant →]
```

**Seller tiers:**

| Tier | Badge | Requirements | Perks |
|------|-------|-------------|-------|
| Nouveau vendeur | (none) | Just registered | Standard commission |
| Vendeur vérifié ✓ | Blue check | ID verified + 50 orders fulfilled, 0 disputes | -1% commission, priority support |
| Top Vendeur ⭐ | Gold star | Top 5% GMV in 90 days, return rate <10% | -2% commission, featured in search, "Top Vendeur" on store page |

Badge visible on seller's storefront. Buyers filter by "Top Vendeur" in search.

**Velocity limits (new seller protection):**
Prevents fraud and overwhelm:
- Week 1: max 10 orders/day
- Week 2: max 30/day
- Week 3: max 100/day
- Week 4+: unlimited

If seller hits limit: "Vous avez atteint votre limite de commandes pour aujourd'hui (10/10). Votre limite augmentera la semaine prochaine."

This is also a platform safety mechanism (prevents fake stores from spiking then disappearing).

**"Sell on ShopDZ" acquisition touchpoints:**
- Post-purchase page (buyer side): "Vous aussi, vendez sur ShopDZ →"
- Homepage footer
- After any product page: "Cette boutique vous inspire ? Ouvrez la vôtre gratuitement →"
- These convert existing active buyers into sellers (highest-quality seller acquisition channel)

**Seller Academy:**
Short video tutorials (Darija with French subtitles, 2-5 min each):
```
📚 Académie ShopDZ

  🎬  Comment prendre des photos avec votre téléphone
       5 min · Non visionné
       
  🎬  Fixer le bon prix pour votre produit
       3 min · Non visionné
       
  🎬  Gérer vos commandes au quotidien
       4 min · ✅ Visionné
       
  🎬  Stratégie Ramadan : préparez-vous 1 mois avant
       6 min · Non visionné
       
  🎬  Comment augmenter vos avis positifs
       3 min · Non visionné
```

Videos hosted on-platform (not YouTube — keeps seller in dashboard). Watch progress tracked. Badges earned ("Vendeur Certifié ShopDZ" after completing all 5 core modules).

---

## IMPLEMENTATION PRIORITY

Given current codebase state, recommended build order:

### Phase 1 — Critical (fixes broken workflows)
1. **Order status management** — sellers MUST be able to confirm/ship/cancel orders. Currently zero action capability. This is the most urgent fix.
2. **Delivery credentials UI** — the Yalidine integration is coded but sellers can't configure it. Build `/seller/settings/delivery` page.
3. **Low stock alerts on dashboard** — products hitting threshold must appear on dashboard.

### Phase 2 — High value (10x improvements)
4. **Variant support in product form** — current single-stock-number product model is limiting
5. **Bulk order actions + batch label print** — essential for any seller doing >10 orders/day
6. **Payout page** — sellers literally don't know when they get paid. Build this immediately.
7. **In-app messenger** — stops leakage to WhatsApp outside platform

### Phase 3 — Differentiation (market leadership)
8. **Flash sales + promo code builder** — full featured, Ramadan-aware
9. **Conversion funnel analytics + insights tab** — actionable, not just numbers
10. **Multi-store** — major differentiator, medium complexity
11. **Seller Academy** — video content is a separate production effort

---

## DESIGN TOKENS (apply to all seller pages)

All seller dashboard pages should share these:
```
Sidebar background:  #111827  (Neutral 900)
Sidebar active item: left border 4px #2E6DB4 + text #FFFFFF
Content background:  #F9FAFB  (Neutral 100)
Card background:     #FFFFFF
Primary action:      #1B3A6B → hover: #2E6DB4
Danger action:       #DC2626
Success:             #1A7A45
Warning:             #D97706
Table row hover:     #EEF4FB
All prices:          Intl.NumberFormat('fr-DZ') — always DA, never $
```

Seller dashboard typography matches admin panel (Inter, Tailwind defaults) for consistency.

---

*This document reflects the state as of June 2026 audit. Re-audit after each phase ships.*
