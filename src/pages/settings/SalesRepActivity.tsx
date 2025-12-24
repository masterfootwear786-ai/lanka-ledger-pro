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

interface UserActivityData {
  id: string;
  full_name: string;
  email: string;
  username: string | null;
  is_sales_rep: boolean;
  role: string;
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
  const [users, setUsers] = useState<UserActivityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("7");

  useEffect(() => {
    fetchUserActivityData();
  }, [dateRange]);

  const fetchUserActivityData = async () => {
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

      // Fetch ALL users in the company (not just sales reps)
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .eq("company_id", profile.company_id)
        .eq("active", true);

      if (!profiles || profiles.length === 0) {
        setUsers([]);
        setLoading(false);
        return;
      }

      // Get all user roles for these users
      const { data: userRoles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .eq("company_id", profile.company_id);

      const userRoleMap = new Map<string, string>();
      userRoles?.forEach(ur => {
        userRoleMap.set(ur.user_id, ur.role);
      });

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(dateRange));
      const startDateStr = startDate.toISOString().split("T")[0];

      // Fetch data for each user
      const usersData: UserActivityData[] = await Promise.all(
        profiles.map(async (userProfile) => {
          // Fetch actual counts from invoices, orders, receipts
          const { count: invoiceCount } = await supabase
            .from("invoices")
            .select("*", { count: "exact", head: true })
            .eq("created_by", userProfile.id)
            .eq("company_id", profile.company_id)
            .gte("invoice_date", startDateStr)
            .is("deleted_at", null);

          const { count: orderCount } = await supabase
            .from("sales_orders")
            .select("*", { count: "exact", head: true })
            .eq("created_by", userProfile.id)
            .eq("company_id", profile.company_id)
            .gte("order_date", startDateStr)
            .is("deleted_at", null);

          const { count: receiptCount } = await supabase
            .from("receipts")
            .select("*", { count: "exact", head: true })
            .eq("created_by", userProfile.id)
            .eq("company_id", profile.company_id)
            .gte("receipt_date", startDateStr)
            .is("deleted_at", null);

          // Get invoice totals
          const { data: invoiceTotals } = await supabase
            .from("invoices")
            .select("grand_total")
            .eq("created_by", userProfile.id)
            .eq("company_id", profile.company_id)
            .gte("invoice_date", startDateStr)
            .is("deleted_at", null);

          // Get receipt totals
          const { data: receiptTotals } = await supabase
            .from("receipts")
            .select("amount")
            .eq("created_by", userProfile.id)
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
            .eq("user_id", userProfile.id)
            .order("login_at", { ascending: false })
            .limit(10);

          // Get recent activity
          const { data: recentActivity } = await supabase
            .from("activity_logs")
            .select("action_type, entity_type, entity_name, created_at")
            .eq("user_id", userProfile.id)
            .order("created_at", { ascending: false })
            .limit(20);

          return {
            id: userProfile.id,
            full_name: userProfile.full_name || "Unknown",
            email: userProfile.email,
            username: userProfile.username,
            is_sales_rep: userProfile.is_sales_rep || false,
            role: userRoleMap.get(userProfile.id) || "user",
            stats: aggregatedStats,
            loginHistory: loginHistory || [],
            recentActivity: recentActivity || [],
          };
        })
      );

      setUsers(usersData);
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

  const filteredUsers =
    selectedUser === "all"
      ? users
      : users.filter((u) => u.id === selectedUser);

  const totalStats = filteredUsers.reduce(
    (acc, user) => ({
      invoices: acc.invoices + user.stats.invoices_created,
      orders: acc.orders + user.stats.orders_created,
      receipts: acc.receipts + user.stats.receipts_created,
      sales: acc.sales + user.stats.total_sales,
      collections: acc.collections + user.stats.total_collections,
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
            can view user activity.
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
              User Activity
            </h1>
            <p className="text-muted-foreground mt-2">
              Monitor user performance and activity
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <Select value={selectedUser} onValueChange={setSelectedUser}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select User" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Users</SelectItem>
            {users.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.full_name}
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

      {users.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <UsersIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No users found</p>
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
              {filteredUsers.map((user) => (
                <Card key={user.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <UsersIcon className="h-5 w-5" />
                        {user.full_name}
                        {user.username && (
                          <Badge variant="secondary">@{user.username}</Badge>
                        )}
                      </div>
                      <Badge className={user.role === 'admin' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' : user.role === 'sales_rep' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'}>
                        {user.role === 'admin' ? 'Admin' : user.role === 'sales_rep' ? 'Sales Rep' : 'User'}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <div className="text-2xl font-bold">
                          {user.stats.invoices_created}
                        </div>
                        <div className="text-sm text-muted-foreground">Invoices</div>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <div className="text-2xl font-bold">
                          {user.stats.orders_created}
                        </div>
                        <div className="text-sm text-muted-foreground">Orders</div>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <div className="text-2xl font-bold">
                          {user.stats.receipts_created}
                        </div>
                        <div className="text-sm text-muted-foreground">Receipts</div>
                      </div>
                      <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {formatCurrency(user.stats.total_sales)}
                        </div>
                        <div className="text-sm text-muted-foreground">Sales</div>
                      </div>
                      <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          {formatCurrency(user.stats.total_collections)}
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
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.flatMap((user) =>
                      user.recentActivity.map((activity, idx) => (
                        <TableRow key={`${user.id}-${idx}`}>
                          <TableCell className="font-medium">
                            {user.full_name}
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
                    {filteredUsers.every((u) => u.recentActivity.length === 0) && (
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
                      <TableHead>User</TableHead>
                      <TableHead>Login Time</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.flatMap((user) =>
                      user.loginHistory.map((login, idx) => (
                        <TableRow key={`${user.id}-login-${idx}`}>
                          <TableCell className="font-medium">
                            {user.full_name}
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
                    {filteredUsers.every((u) => u.loginHistory.length === 0) && (
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
