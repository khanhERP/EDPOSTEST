import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguageStore, type Language } from "@/lib/i18n";

const languages = [
  { code: 'ko' as Language, name: '한국어', flag: '🇰🇷' },
  { code: 'en' as Language, name: 'English', flag: '🇺🇸' },
  { code: 'vi' as Language, name: 'Tiếng Việt', flag: '🇻🇳' },
];

export function LanguageSwitcher() {
  const { currentLanguage, setLanguage } = useLanguageStore();
  
  const currentLang = languages.find(lang => lang.code === currentLanguage);

  const handleLanguageChange = (langCode: Language) => {
    console.log('🌐 Language change clicked:', langCode);
    console.log('🌐 Previous language:', currentLanguage);
    setLanguage(langCode);
    
    // Force a small delay to ensure state propagation
    setTimeout(() => {
      console.log('🌐 Language change completed:', langCode);
      console.log('🌐 Store state after change:', useLanguageStore.getState().currentLanguage);
    }, 100);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 bg-white bg-opacity-20 hover:bg-opacity-30 border-white border-opacity-30 text-white hover:text-white">
          <Globe className="h-4 w-4" />
          <span>{currentLang?.flag}</span>
          <span className="hidden sm:inline">{currentLang?.name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            className={currentLanguage === language.code ? "bg-accent" : ""}
          >
            <span className="mr-2">{language.flag}</span>
            {language.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}