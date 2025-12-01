// ----- FULL STOCK RESYNC ENGINE -----

const syncStockFromInvoices = async () => {
  setSyncing(true);

  try {
    // 1. Load items
    const { data: items } = await supabase.from("items").select("id").eq("track_inventory", true);

    // 2. Load initial stock
    const { data: stock } = await supabase.from("stock_by_size").select("id, item_id, size, quantity");

    const stockMap = new Map();
    stock.forEach((s) => {
      stockMap.set(`${s.item_id}-${s.size}`, s.quantity || 0);
    });

    // 3. Load all invoice lines
    const { data: lines } = await supabase
      .from("invoice_lines")
      .select("item_id, size_39, size_40, size_41, size_42, size_43, size_44, size_45")
      .is("deleted_at", null);

    // 4. Deduct each invoice line
    lines.forEach((line) => {
      const sizes = {
        39: line.size_39,
        40: line.size_40,
        41: line.size_41,
        42: line.size_42,
        43: line.size_43,
        44: line.size_44,
        45: line.size_45,
      };

      Object.entries(sizes).forEach(([size, qty]) => {
        if (!qty) return;

        const key = `${line.item_id}-${size}`;
        const current = stockMap.get(key) || 0;
        stockMap.set(key, current - qty);
      });
    });

    // 5. Write back to DB
    for (const [key, quantity] of stockMap.entries()) {
      const [item_id, size] = key.split("-");

      await supabase
        .from("stock_by_size")
        .update({
          quantity,
          updated_at: new Date().toISOString(),
        })
        .eq("item_id", item_id)
        .eq("size", size);
    }

    toast.success("Stock fully updated from invoices!");
    fetchStock();
  } catch (e: any) {
    toast.error(e.message);
  }

  setSyncing(false);
};
