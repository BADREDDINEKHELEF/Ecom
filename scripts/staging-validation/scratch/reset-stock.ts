import { createAdminClient } from '../../../src/lib/supabase/admin'

async function run() {
  const supabase = createAdminClient()

  console.log('Fetching all products...')
  const { data: products, error: fetchErr } = await supabase
    .from('products')
    .select('id, name, stock')

  if (fetchErr) {
    console.error('Failed to fetch products:', fetchErr)
    process.exit(1)
  }

  console.log(`Found ${products?.length ?? 0} products. Resetting stock to 999...`)

  for (const product of products ?? []) {
    const { error: updateErr } = await supabase
      .from('products')
      .update({ stock: 999 })
      .eq('id', product.id)

    if (updateErr) {
      console.error(`Failed to update stock for product ${product.name} (${product.id}):`, updateErr)
    } else {
      console.log(`Updated product: ${product.name} -> Stock: 999`)
    }
  }

  console.log('Stock reset complete!')
}

run()
