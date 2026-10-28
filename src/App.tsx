import { useState } from "react";
import { BottomNavigation, type ScreenKey } from "./components/BottomNavigation";
import { ReportScreen } from "./screens/ReportScreen";
import { MonthScreen } from "./screens/MonthScreen";
import { SettingsScreen } from "./screens/SettingsScreen";

function App() {
  const [screen, setScreen] = useState<ScreenKey>("report");

  return (
    <div className="min-h-screen">
      {screen === "report" && <ReportScreen />}
      {screen === "month" && <MonthScreen />}
      {screen === "settings" && <SettingsScreen />}
      <BottomNavigation active={screen} onChange={setScreen} />
    </div>
  );
}

export default App;
