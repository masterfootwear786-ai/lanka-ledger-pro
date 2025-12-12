import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Palette, Ruler, Package, Flame } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SalesData {
  artNo: string;
  color: string;
  sizes: { [key: number]: number };
  totalPairs: number;
}

interface RankedItem {
  name: string;
  quantity: number;
  percentage: number;
}

export default function HotSelling() {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("all");
  const [topDesigns, setTopDesigns] = useState<RankedItem[]>([]);
  const [lowDesigns, setLowDesigns] = useState<RankedItem[]>([]);
  const [topSizes, setTopSizes] = useState<RankedItem[]>([]);
  const [topColors, setTopColors] = useState<RankedItem[]>([]);
  const [totalSold, setTotalSold] = useState(0);

  useEffect(() => {
    fetchSalesData();
  }, [period]);

  const fetchSalesData = async () => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (!profileData?.company_id) return;

      // Build date filter
      let dateFilter = "";
      const now = new Date();
      if (period === "week") {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateFilter = weekAgo.toISOString().split('T')[0];
      } else if (period === "month") {
        const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        dateFilter = monthAgo.toISOString().split('T')[0];
      } else if (period === "year") {
        const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        dateFilter = yearAgo.toISOString().split('T')[0];
      }

      // Fetch invoice lines with item and invoice data
      let query = supabase
        .from("invoice_lines")
        .select(`
          *,
          item:items(id, code, color),
          invoice:invoices!inner(id, invoice_date, company_id, deleted_at)
        `)
        .eq("invoice.company_id", profileData.company_id)
        .is("invoice.deleted_at", null);

      if (dateFilter) {
        query = query.gte("invoice.invoice_date", dateFilter);
      }

      const { data: invoiceLines, error } = await query;

      if (error) throw error;

      // Aggregate data
      const designTotals: { [key: string]: number } = {};
      const colorTotals: { [key: string]: number } = {};
      const sizeTotals: { [key: number]: number } = { 39: 0, 40: 0, 41: 0, 42: 0, 43: 0, 44: 0, 45: 0 };
      let grandTotal = 0;

      (invoiceLines || []).forEach((line: any) => {
        const artNo = line.item?.code || line.description || "Unknown";
        const color = line.item?.color || "Unknown";

        // Sum up all sizes for this line
        const sizes = [39, 40, 41, 42, 43, 44, 45];
        let lineTotal = 0;

        sizes.forEach(size => {
          const qty = Number(line[`size_${size}`]) || 0;
          sizeTotals[size] += qty;
          lineTotal += qty;
        });

        // If no size breakdown, use quantity
        if (lineTotal === 0) {
          lineTotal = Number(line.quantity) || 0;
        }

        designTotals[artNo] = (designTotals[artNo] || 0) + lineTotal;
        colorTotals[color] = (colorTotals[color] || 0) + lineTotal;
        grandTotal += lineTotal;
      });

      setTotalSold(grandTotal);

      // Calculate rankings with percentages
      const calcRanking = (totals: { [key: string]: number }): RankedItem[] => {
        return Object.entries(totals)
          .map(([name, quantity]) => ({
            name,
            quantity,
            percentage: grandTotal > 0 ? (quantity / grandTotal) * 100 : 0,
          }))
          .sort((a, b) => b.quantity - a.quantity);
      };

      const designRanking = calcRanking(designTotals);
      setTopDesigns(designRanking.slice(0, 10));
      setLowDesigns(designRanking.filter(d => d.quantity > 0).slice(-5).reverse());

      const colorRanking = calcRanking(colorTotals);
      setTopColors(colorRanking.slice(0, 8));

      // Size ranking
      const sizeRanking = Object.entries(sizeTotals)
        .map(([size, quantity]) => ({
          name: `Size ${size}`,
          quantity,
          percentage: grandTotal > 0 ? (quantity / grandTotal) * 100 : 0,
        }))
        .sort((a, b) => b.quantity - a.quantity);
      setTopSizes(sizeRanking);

    } catch (error: any) {
      toast.error("Error fetching sales data: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const RankingCard = ({
    title,
    icon: Icon,
    items,
    iconColor,
    showRank = true,
  }: {
    title: string;
    icon: any;
    items: RankedItem[];
    iconColor: string;
    showRank?: boolean;
  }) => (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Icon className={`h-5 w-5 ${iconColor}`} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="text-center py-4 text-muted-foreground">Loading...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">No data available</div>
        ) : (
          items.map((item, index) => (
            <div key={item.name} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  {showRank && (
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      index === 0 ? "bg-amber-500 text-white" :
                      index === 1 ? "bg-slate-400 text-white" :
                      index === 2 ? "bg-amber-700 text-white" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {index + 1}
                    </span>
                  )}
                  <span className="font-medium truncate max-w-[120px]">{item.name}</span>
                </div>
                <div className="text-right">
                  <span className="font-bold">{item.quantity.toLocaleString()}</span>
                  <span className="text-muted-foreground ml-1">({item.percentage.toFixed(1)}%)</span>
                </div>
              </div>
              <Progress value={item.percentage} className="h-2" />
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Flame className="h-8 w-8 text-orange-500" />
          <div>
            <h1 className="text-3xl font-bold">Hot Selling</h1>
            <p className="text-muted-foreground text-sm">Sales analytics by design, size, and color</p>
          </div>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Time Period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="week">Last 7 Days</SelectItem>
            <SelectItem value="month">Last 30 Days</SelectItem>
            <SelectItem value="year">Last Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Card */}
      <Card className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 border-orange-500/20">
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Items Sold</p>
              <p className="text-4xl font-bold">{totalSold.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">pairs</p>
            </div>
            <Package className="h-16 w-16 text-orange-500/50" />
          </div>
        </CardContent>
      </Card>

      {/* Rankings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <RankingCard
          title="Top Selling Designs"
          icon={TrendingUp}
          items={topDesigns}
          iconColor="text-green-500"
        />
        <RankingCard
          title="Low Selling Designs"
          icon={TrendingDown}
          items={lowDesigns}
          iconColor="text-red-500"
        />
        <RankingCard
          title="Top Selling Sizes"
          icon={Ruler}
          items={topSizes}
          iconColor="text-blue-500"
        />
        <RankingCard
          title="Top Selling Colors"
          icon={Palette}
          items={topColors}
          iconColor="text-purple-500"
        />
      </div>

      <div className="text-sm text-muted-foreground">
        <p>• Data is calculated from invoice sales records</p>
        <p>• Percentages show the share of total sales</p>
      </div>
    </div>
  );
}
