-- Migration 024: New subscription tiers — Starter / Pro / Business
-- Removes commission model entirely. Pricing based on monthly order volume.

ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS min_orders_month INTEGER DEFAULT 0;
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS max_orders_month INTEGER;

UPDATE public.subscription_plans SET
  name_en   = 'Starter',
  name_fr   = 'Starter',
  name_ar   = 'مبتدئ',
  price_dzd = 2000,
  min_orders_month = 0,
  max_orders_month = 100,
  features_en = '["Up to 100 orders/month", "Unlimited products", "1 store", "Standard support", "Order management", "Basic analytics", "0% commission"]'::jsonb,
  features_fr = '["Jusqu''à 100 commandes/mois", "Produits illimités", "1 boutique", "Support standard", "Gestion des commandes", "Analytique de base", "0% de commission"]'::jsonb,
  features_ar = '["حتى 100 طلب شهريًا", "منتجات غير محدودة", "متجر واحد", "دعم عادي", "إدارة الطلبات", "تحليلات أساسية", "0% عمولة"]'::jsonb
WHERE id = 'basic';

UPDATE public.subscription_plans SET
  name_en   = 'Pro',
  name_fr   = 'Pro',
  name_ar   = 'احترافي',
  price_dzd = 5000,
  min_orders_month = 101,
  max_orders_month = 500,
  features_en = '["101–500 orders/month", "Unlimited products", "3 stores", "Priority support", "Advanced analytics", "3 sponsored products", "Custom store branding", "0% commission"]'::jsonb,
  features_fr = '["101 à 500 commandes/mois", "Produits illimités", "3 boutiques", "Support prioritaire", "Analytique avancée", "3 produits sponsorisés", "Image de marque personnalisée", "0% de commission"]'::jsonb,
  features_ar = '["101 إلى 500 طلب شهريًا", "منتجات غير محدودة", "3 متاجر", "دعم ذو أولوية", "تحليلات متقدمة", "3 منتجات مدفوعة", "0% عمولة"]'::jsonb
WHERE id = 'professional';

UPDATE public.subscription_plans SET
  name_en   = 'Business',
  name_fr   = 'Business',
  name_ar   = 'أعمال',
  price_dzd = 9000,
  min_orders_month = 501,
  max_orders_month = NULL,
  features_en = '["500+ orders/month", "Unlimited products", "Unlimited stores", "Dedicated support", "Full analytics suite", "10 sponsored products", "Homepage featured placement", "API access", "0% commission"]'::jsonb,
  features_fr = '["500+ commandes/mois", "Produits illimités", "Boutiques illimitées", "Support dédié", "Suite analytique complète", "10 produits sponsorisés", "Mise en avant page d''accueil", "Accès API", "0% de commission"]'::jsonb,
  features_ar = '["أكثر من 500 طلب شهريًا", "منتجات غير محدودة", "متاجر غير محدودة", "دعم مخصص", "مجموعة تحليلات كاملة", "10 منتجات مدفوعة", "عرض مميز في الصفحة الرئيسية", "وصول API", "0% عمولة"]'::jsonb
WHERE id = 'enterprise';
