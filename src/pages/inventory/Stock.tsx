const syncStockFromInvoices = async () => {
  setSyncing(true);
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", user.id).single();

    const companyId = profile?.company_id;
    if (!companyId) throw new Error("No company assigned");

    // 1️⃣ GET ALL INITIAL STOCK (correct base quantity)
    const { data: stockBySize } = await supabase
      .from("stock_by_size")
      .select("id, item_id, size, quantity")
      .eq("company_id", companyId);

    // Make map for fast operations
    const stockMap = new Map<string, number>();
    stockBySize?.forEach((r) => {
      const key = `${r.item_id}-${r.size}`;
      stockMap.set(key, r.quantity || 0);
    });

    // 2️⃣ GET ALL INVOICE LINES (sales)
    const { data: invoiceLines } = await supabase
      .from("invoice_lines")
      .select("item_id, size_39, size_40, size_41, size_42, size_43, size_44, size_45")
      .is("deleted_at", null);

    // 3️⃣ DEDUCT SOLD ITEMS FROM STOCK
    invoiceLines?.forEach((line) => {
      const itemsSold = {
        39: line.size_39,
        40: line.size_40,
        41: line.size_41,
        42: line.size_42,
        43: line.size_43,
        44: line.size_44,
        45: line.size_45,
      };

      Object.entries(itemsSold).forEach(([size, qty]) => {
        if (!qty) return;

        const key = `${line.item_id}-${size}`;
        const current = stockMap.get(key) ?? 0;
        stockMap.set(key, current - qty);
      });
    });

    // 4️⃣ WRITE ALL UPDATED STOCK BACK TO DATABASE
    let updated = 0;

    for (const [key, qty] of stockMap.entries()) {
      const [item_id, size] = key.split("-");

      await supabase
        .from("stock_by_size")
        .update({
          quantity: qty,
          updated_at: new Date().toISOString(),
        })
        .eq("item_id", item_id)
        .eq("size", size)
        .eq("company_id", companyId);

      updated++;
    }

    toast.success(`Stock fully recalculated. Updated ${updated} records.`);
    fetchStock();
  } catch (err: any) {
    toast.error(err.message);
  }

  setSyncing(false);
};
