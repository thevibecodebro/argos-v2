create unique index if not exists training_modules_org_order_unique
  on public.training_modules (org_id, order_index)
  where order_index is not null;
