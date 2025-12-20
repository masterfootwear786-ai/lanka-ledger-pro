import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Users as UsersIcon,
  Activity,
  TrendingUp,
  FileText,
  Receipt,
  ShoppingCart,
  Calendar,
  Clock,
  ArrowLeft,
} from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SalesRepData {
  id: string;
  full_name: string;
  email: string;
  username: string | null;
  is_sales_rep: boolean;
  stats: {
    invoices_created: number;
    orders_created: number;
    receipts_created: number;
    total_sales: number;
    total_collections: number;
  };
  loginHistory: {
    login_at: string;
    logout_at: string | null;
  }[];
  recentActivity: {
    action_type: string;
    entity_type: string;
    entity_name: string;
    created_at: string;
  }[];
}

export default function SalesRepActivity() {
  const { toast } = useToast();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const [salesReps, setSalesReps] = useState<SalesRepData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRep, setSelectedRep] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("7");

  useEffect(() => {
    fetchSalesRepData();
  }, [dateRange]);

  const fetchSalesRepData = async () => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (!profile?.company_id) return;

      // Fetch all users with sales_rep role in company
      const { data: salesRepRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "sales_rep")
        .eq("company_id", profile.company_id);

      if (!salesRepRoles || salesRepRoles.length === 0) {
        setSalesReps([]);
        setLoading(false);
        return;
      }

      const salesRepUserIds = salesRepRoles.map(r => r.user_id);

      // Fetch profiles for these sales reps
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("id", salesRepUserIds)
        .eq("active", true);

      if (!profiles || profiles.length === 0) {
        setSalesReps([]);
        setLoading(false);
        return;
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(dateRange));
      const startDateStr = startDate.toISOString().split("T")[0];

      // Fetch data for each sales rep
      const repsData: SalesRepData[] = await Promise.all(
        profiles.map(async (rep) => {
          // Get stats from sales_rep_stats table
          const { data: stats } = await supabase
            .from("sales_rep_stats")
            .select("*")
            .eq("user_id", rep.id)
            .gte("period_date", startDateStr);

          // Also fetch actual counts from invoices, orders, receipts for accurate data
          const { count: invoiceCount } = await supabase
            .from("invoices")
            .select("*", { count: "exact", head: true })
            .eq("created_by", rep.id)
            .eq("company_id", profile.company_id)
            .gte("invoice_date", startDateStr)
            .is("deleted_at", null);

          const { count: orderCount } = await supabase
            .from("sales_orders")
            .select("*", { count: "exact", head: true })
            .eq("created_by", rep.id)
            .eq("company_id", profile.company_id)
            .gte("order_date", startDateStr)
            .is("deleted_at", null);

          const { count: receiptCount } = await supabase
            .from("receipts")
            .select("*", { count: "exact", head: true })
            .eq("created_by", rep.id)
            .eq("company_id", profile.company_id)
            .gte("receipt_date", startDateStr)
            .is("deleted_at", null);

          // Get invoice totals
          const { data: invoiceTotals } = await supabase
            .from("invoices")
            .select("grand_total")
            .eq("created_by", rep.id)
            .eq("company_id", profile.company_id)
            .gte("invoice_date", startDateStr)
            .is("deleted_at", null);

          // Get receipt totals
          const { data: receiptTotals } = await supabase
            .from("receipts")
            .select("amount")
            .eq("created_by", rep.id)
            .eq("company_id", profile.company_id)
            .gte("receipt_date", startDateStr)
            .is("deleted_at", null);

          const totalSales = invoiceTotals?.reduce((sum, inv) => sum + (Number(inv.grand_total) || 0), 0) || 0;
          const totalCollections = receiptTotals?.reduce((sum, rec) => sum + (Number(rec.amount) || 0), 0) || 0;

          const aggregatedStats = {
            invoices_created: invoiceCount || 0,
            orders_created: orderCount || 0,
            receipts_created: receiptCount || 0,
            total_sales: totalSales,
            total_collections: totalCollections,
          };

          // Get login history
          const { data: loginHistory } = await supabase
            .from("login_history")
            .select("login_at, logout_at")
            .eq("user_id", rep.id)
            .order("login_at", { ascending: false })
            .limit(10);

          // Get recent activity
          const { data: recentActivity } = await supabase
            .from("activity_logs")
            .select("action_type, entity_type, entity_name, created_at")
            .eq("user_id", rep.id)
            .order("created_at", { ascending: false })
            .limit(20);

          return {
            id: rep.id,
            full_name: rep.full_name || "Unknown",
            email: rep.email,
            username: rep.username,
            is_sales_rep: rep.is_sales_rep,
            stats: aggregatedStats,
            loginHistory: loginHistory || [],
            recentActivity: recentActivity || [],
          };
        })
      );

      setSalesReps(repsData);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: "LKR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case "create":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "update":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "delete":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "login":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      default:
        return "";
    }
  };

  const filteredReps =
    selectedRep === "all"
      ? salesReps
      : salesReps.filter((r) => r.id === selectedRep);

  const totalStats = filteredReps.reduce(
    (acc, rep) => ({
      invoices: acc.invoices + rep.stats.invoices_created,
      orders: acc.orders + rep.stats.orders_created,
      receipts: acc.receipts + rep.stats.receipts_created,
      sales: acc.sales + rep.stats.total_sales,
      collections: acc.collections + rep.stats.total_collections,
    }),
    { invoices: 0, orders: 0, receipts: 0, sales: 0, collections: 0 }
  );

  if (loading || roleLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin()) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You do not have permission to access this page. Only administrators
            can view sales rep activity.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Activity className="h-8 w-8" />
              Sales Rep Activity
            </h1>
            <p className="text-muted-foreground mt-2">
              Monitor sales representative performance and activity
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <Select value={selectedRep} onValueChange={setSelectedRep}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select Sales Rep" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sales Reps</SelectItem>
            {salesReps.map((rep) => (
              <SelectItem key={rep.id} value={rep.id}>
                {rep.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Date Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Invoices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.invoices}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.orders}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Receipts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.receipts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Total Sales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalStats.sales)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Collections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(totalStats.collections)}
            </div>
          </CardContent>
        </Card>
      </div>

      {salesReps.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <UsersIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No sales representatives found</p>
            <p className="text-sm text-muted-foreground mt-2">
              Mark users as Sales Representatives in User Management to track their activity.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="activity">Activity Log</TabsTrigger>
            <TabsTrigger value="logins">Login History</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid gap-4">
              {filteredReps.map((rep) => (
                <Card key={rep.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <UsersIcon className="h-5 w-5" />
                        {rep.full_name}
                        {rep.username && (
                          <Badge variant="secondary">@{rep.username}</Badge>
                        )}
                      </div>
                      <Badge className="bg-purple-100 text-purple-800">
                        Sales Rep
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <div className="text-2xl font-bold">
                          {rep.stats.invoices_created}
                        </div>
                        <div className="text-sm text-muted-foreground">Invoices</div>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <div className="text-2xl font-bold">
                          {rep.stats.orders_created}
                        </div>
                        <div className="text-sm text-muted-foreground">Orders</div>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <div className="text-2xl font-bold">
                          {rep.stats.receipts_created}
                        </div>
                        <div className="text-sm text-muted-foreground">Receipts</div>
                      </div>
                      <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {formatCurrency(rep.stats.total_sales)}
                        </div>
                        <div className="text-sm text-muted-foreground">Sales</div>
                      </div>
                      <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          {formatCurrency(rep.stats.total_collections)}
                        </div>
                        <div className="text-sm text-muted-foreground">Collections</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="activity">
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sales Rep</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReps.flatMap((rep) =>
                      rep.recentActivity.map((activity, idx) => (
                        <TableRow key={`${rep.id}-${idx}`}>
                          <TableCell className="font-medium">
                            {rep.full_name}
                          </TableCell>
                          <TableCell>
                            <Badge className={getActionBadgeColor(activity.action_type)}>
                              {activity.action_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="capitalize">
                            {activity.entity_type}
                          </TableCell>
                          <TableCell>{activity.entity_name || "-"}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(
                              new Date(activity.created_at),
                              "MMM dd, HH:mm"
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                    {filteredReps.every((r) => r.recentActivity.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          <Activity className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-muted-foreground">No activity recorded yet</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logins">
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sales Rep</TableHead>
                      <TableHead>Login Time</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReps.flatMap((rep) =>
                      rep.loginHistory.map((login, idx) => (
                        <TableRow key={`${rep.id}-login-${idx}`}>
                          <TableCell className="font-medium">
                            {rep.full_name}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              {format(
                                new Date(login.login_at),
                                "MMM dd, yyyy HH:mm"
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-green-600">
                              Active Session
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                    {filteredReps.every((r) => r.loginHistory.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8">
                          <Calendar className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-muted-foreground">No login history available</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
