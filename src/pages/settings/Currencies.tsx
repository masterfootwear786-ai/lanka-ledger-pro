import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign } from "lucide-react";

export default function Currencies() {
  const { toast } = useToast();
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCurrencies();
  }, []);

  const fetchCurrencies = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('currencies')
        .select('*')
        .order('code', { ascending: true });

      if (error) throw error;

      setCurrencies(data || []);
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

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <DollarSign className="h-8 w-8" />
          Currencies
        </h1>
        <p className="text-muted-foreground mt-2">
          View available currencies in the system
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {currencies.map((currency) => (
          <Card key={currency.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{currency.code}</span>
                <Badge variant={currency.active ? "default" : "secondary"}>
                  {currency.active ? "Active" : "Inactive"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm font-semibold">{currency.name}</div>
              {currency.symbol && (
                <div className="text-2xl font-bold text-primary">
                  {currency.symbol}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {currencies.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center">
            <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No currencies found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
