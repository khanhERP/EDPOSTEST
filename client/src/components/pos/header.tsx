import { useState, useEffect } from "react";
import { ScanBarcode, LogOut } from "lucide-react";

export function POSHeader() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <header className="bg-blue-500 text-white shadow-material-lg fixed top-0 left-0 right-0 z-50">
      <div className="px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div className="text-2xl font-bold flex items-center">
            <img src="@assets/image_1753014739869.png" alt="EDPOS Logo" className="mr-2 h-8" />
            EDPOS
          </div>
          <div className="text-sm opacity-90">Main Store Location</div>
        </div>
        
        <div className="flex items-center space-x-6">
          <div className="text-right">
            <div className="text-sm opacity-90">Cashier</div>
            <div className="font-medium">John Smith</div>
          </div>
          <div className="text-right">
            <div className="text-sm opacity-90">Time</div>
            <div className="font-medium">{formatTime(currentTime)}</div>
          </div>
          <button className="bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-lg transition-all duration-200 flex items-center">
            <LogOut className="mr-2" size={16} />
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
