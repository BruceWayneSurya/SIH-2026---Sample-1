import { LanguageSwitcher } from "./language-switcher";
import { ThemeToggle } from "./theme-toggle";

export function AppearanceControls() {
  return (
    <div className="inline-flex shrink-0 items-center gap-2">
      <LanguageSwitcher />
      <ThemeToggle />
    </div>
  );
}
