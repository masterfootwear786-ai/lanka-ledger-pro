import { Phone } from "lucide-react";

const Index = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
      <div className="text-center space-y-8 p-8">
        <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
          Welcome to Master Footwear
        </h1>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-lg">
          <a 
            href="tel:0771304324" 
            className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
          >
            <Phone className="h-5 w-5" />
            <span>077 1304324</span>
          </a>
          <span className="hidden sm:inline text-muted-foreground">|</span>
          <a 
            href="tel:0781304324" 
            className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
          >
            <Phone className="h-5 w-5" />
            <span>078 1304324</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default Index;
