import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

export const LANGUAGES = [
  { code: "en", label: "English", flag: "🇬🇧", dir: "ltr" as const },
  { code: "ar", label: "العربية", flag: "🇸🇦", dir: "rtl" as const },
  { code: "fr", label: "Français", flag: "🇫🇷", dir: "ltr" as const },
  { code: "es", label: "Español", flag: "🇪🇸", dir: "ltr" as const },
  { code: "ru", label: "Русский", flag: "🇷🇺", dir: "ltr" as const },
  { code: "ko", label: "한국어", flag: "🇰🇷", dir: "ltr" as const },
  { code: "fil", label: "Filipino", flag: "🇵🇭", dir: "ltr" as const },
] as const;

export type LangCode = (typeof LANGUAGES)[number]["code"];

const resources = {
  en: {
    translation: {
      welcome: {
        title: "NADIBOX",
        chooseHowToContinue: "Choose how to continue",
        guest: "GUEST",
        guestHint: "Enter with your own Xtream server — manage everything locally.",
        enter: "Enter",
        login: "LOGIN",
        loginHint:
          "Subscribers: sign in with the username & password provided by your admin.",
        signIn: "Sign In",
        premiumTag: "Premium IPTV Experience",
        language: "Language",
      },
      login: {
        subtitle: "Subscriber Sign-In",
        username: "Username",
        password: "Password",
        submit: "Sign In",
        submitting: "Signing in...",
        contactAdmin: "No account? Contact your NADIBOX administrator to get credentials.",
        back: "Back",
      },
      home: {
        logout: "Logout",
        profile: "Profile",
        guestMode: "Guest Mode",
        connected: "Connected.",
        awaiting: "Awaiting server sync.",
        waiting: "Waiting to connect.",
        subscriber: "Subscriber",
        expires: "Expires",
        noExpiry: "No expiry set",
        daysRemaining_one: "{{count}} day remaining",
        daysRemaining_other: "{{count}} days remaining",
        expired: "EXPIRED",
        timeshift: "Timeshift",
        categories: {
          liveTv: "Live TV",
          movies: "Movies",
          series: "Series",
          liveTvCount: "+5000 Channels",
          moviesCount: "+1200 Movies",
          seriesCount: "+500 Series",
        },
        infoBar:
          "LIVE: +5000 Channels. MOVIES: +1200 Titles. SERIES: +500 Series.",
      },
      expired: {
        title: "SUBSCRIPTION EXPIRED",
        hi: "Hi",
        message:
          "Your NADIBOX subscription has ended. To continue watching, please contact us on WhatsApp to renew.",
        contactWhatsapp: "Contact on WhatsApp",
        signOut: "Sign Out",
        whatsappPrefill:
          "Hi, my NADIBOX subscription ({{username}}) has expired. I'd like to renew.",
      },
      splash: {
        tagline: "Tune In to the Universe",
        premiumTag: "Premium IPTV Experience",
      },
    },
  },
  ar: {
    translation: {
      welcome: {
        title: "NADIBOX",
        chooseHowToContinue: "اختر كيفية المتابعة",
        guest: "ضيف",
        guestHint: "ادخل بسيرفر Xtream الخاص بك — تحكم بكل شيء محليا.",
        enter: "دخول",
        login: "تسجيل الدخول",
        loginHint: "للمشتركين: سجل الدخول باسم المستخدم وكلمة المرور من المسؤول.",
        signIn: "تسجيل الدخول",
        premiumTag: "تجربة IPTV مميزة",
        language: "اللغة",
      },
      login: {
        subtitle: "تسجيل دخول المشترك",
        username: "اسم المستخدم",
        password: "كلمة المرور",
        submit: "تسجيل الدخول",
        submitting: "جاري تسجيل الدخول...",
        contactAdmin: "لا يوجد حساب؟ تواصل مع مسؤول NADIBOX للحصول على بيانات الاعتماد.",
        back: "رجوع",
      },
      home: {
        logout: "تسجيل الخروج",
        profile: "الملف",
        guestMode: "وضع الضيف",
        connected: "متصل.",
        awaiting: "بانتظار مزامنة السيرفر.",
        waiting: "بانتظار الاتصال.",
        subscriber: "مشترك",
        expires: "ينتهي في",
        noExpiry: "بدون تاريخ انتهاء",
        daysRemaining_one: "متبقي {{count}} يوم",
        daysRemaining_other: "متبقي {{count}} أيام",
        expired: "منتهي",
        timeshift: "تقديم وتأخير",
        categories: {
          liveTv: "بث مباشر",
          movies: "أفلام",
          series: "مسلسلات",
          liveTvCount: "+5000 قناة",
          moviesCount: "+1200 فيلم",
          seriesCount: "+500 مسلسل",
        },
        infoBar: "مباشر: +5000 قناة. أفلام: +1200 عنوان. مسلسلات: +500 مسلسل.",
      },
      expired: {
        title: "انتهى الاشتراك",
        hi: "مرحبا",
        message:
          "لقد انتهى اشتراك NADIBOX الخاص بك. لمتابعة المشاهدة، يرجى التواصل معنا عبر واتساب لتجديد الاشتراك.",
        contactWhatsapp: "تواصل عبر واتساب",
        signOut: "تسجيل الخروج",
        whatsappPrefill:
          "مرحبا، انتهى اشتراك NADIBOX الخاص بي ({{username}}). أرغب بالتجديد.",
      },
      splash: {
        tagline: "اضبط على الكون",
        premiumTag: "تجربة IPTV مميزة",
      },
    },
  },
  fr: {
    translation: {
      welcome: {
        title: "NADIBOX",
        chooseHowToContinue: "Choisissez comment continuer",
        guest: "INVITÉ",
        guestHint:
          "Entrez avec votre propre serveur Xtream — gérez tout localement.",
        enter: "Entrer",
        login: "CONNEXION",
        loginHint:
          "Abonnés : connectez-vous avec le nom d'utilisateur et le mot de passe fournis par votre administrateur.",
        signIn: "Se connecter",
        premiumTag: "Expérience IPTV Premium",
        language: "Langue",
      },
      login: {
        subtitle: "Connexion Abonné",
        username: "Nom d'utilisateur",
        password: "Mot de passe",
        submit: "Se connecter",
        submitting: "Connexion...",
        contactAdmin:
          "Pas de compte ? Contactez votre administrateur NADIBOX pour obtenir les identifiants.",
        back: "Retour",
      },
      home: {
        logout: "Déconnexion",
        profile: "Profil",
        guestMode: "Mode Invité",
        connected: "Connecté.",
        awaiting: "En attente de synchronisation.",
        waiting: "En attente de connexion.",
        subscriber: "Abonné",
        expires: "Expire le",
        noExpiry: "Aucune date d'expiration",
        daysRemaining_one: "{{count}} jour restant",
        daysRemaining_other: "{{count}} jours restants",
        expired: "EXPIRÉ",
        timeshift: "Timeshift",
        categories: {
          liveTv: "TV en direct",
          movies: "Films",
          series: "Séries",
          liveTvCount: "+5000 Chaînes",
          moviesCount: "+1200 Films",
          seriesCount: "+500 Séries",
        },
        infoBar: "DIRECT : +5000 Chaînes. FILMS : +1200 Titres. SÉRIES : +500.",
      },
      expired: {
        title: "ABONNEMENT EXPIRÉ",
        hi: "Bonjour",
        message:
          "Votre abonnement NADIBOX a pris fin. Pour continuer à regarder, contactez-nous sur WhatsApp pour renouveler.",
        contactWhatsapp: "Contacter sur WhatsApp",
        signOut: "Se déconnecter",
        whatsappPrefill:
          "Bonjour, mon abonnement NADIBOX ({{username}}) a expiré. Je souhaite renouveler.",
      },
      splash: {
        tagline: "Branchez-vous sur l'univers",
        premiumTag: "Expérience IPTV Premium",
      },
    },
  },
  es: {
    translation: {
      welcome: {
        title: "NADIBOX",
        chooseHowToContinue: "Elige cómo continuar",
        guest: "INVITADO",
        guestHint: "Entra con tu propio servidor Xtream — gestiona todo localmente.",
        enter: "Entrar",
        login: "INICIAR SESIÓN",
        loginHint:
          "Suscriptores: inicia sesión con el usuario y contraseña que te dio tu administrador.",
        signIn: "Iniciar Sesión",
        premiumTag: "Experiencia IPTV Premium",
        language: "Idioma",
      },
      login: {
        subtitle: "Acceso de Suscriptor",
        username: "Usuario",
        password: "Contraseña",
        submit: "Iniciar Sesión",
        submitting: "Accediendo...",
        contactAdmin:
          "¿No tienes cuenta? Contacta a tu administrador de NADIBOX para obtener credenciales.",
        back: "Atrás",
      },
      home: {
        logout: "Cerrar Sesión",
        profile: "Perfil",
        guestMode: "Modo Invitado",
        connected: "Conectado.",
        awaiting: "Esperando sincronización.",
        waiting: "Esperando conexión.",
        subscriber: "Suscriptor",
        expires: "Expira",
        noExpiry: "Sin fecha de expiración",
        daysRemaining_one: "Queda {{count}} día",
        daysRemaining_other: "Quedan {{count}} días",
        expired: "EXPIRADO",
        timeshift: "Timeshift",
        categories: {
          liveTv: "TV en Vivo",
          movies: "Películas",
          series: "Series",
          liveTvCount: "+5000 Canales",
          moviesCount: "+1200 Películas",
          seriesCount: "+500 Series",
        },
        infoBar: "EN VIVO: +5000 Canales. PELÍCULAS: +1200. SERIES: +500.",
      },
      expired: {
        title: "SUSCRIPCIÓN EXPIRADA",
        hi: "Hola",
        message:
          "Tu suscripción NADIBOX ha finalizado. Para seguir viendo, contáctanos por WhatsApp para renovar.",
        contactWhatsapp: "Contactar por WhatsApp",
        signOut: "Cerrar Sesión",
        whatsappPrefill:
          "Hola, mi suscripción NADIBOX ({{username}}) ha expirado. Me gustaría renovarla.",
      },
      splash: {
        tagline: "Sintoniza con el universo",
        premiumTag: "Experiencia IPTV Premium",
      },
    },
  },
  ru: {
    translation: {
      welcome: {
        title: "NADIBOX",
        chooseHowToContinue: "Выберите, как продолжить",
        guest: "ГОСТЬ",
        guestHint:
          "Войдите со своим собственным сервером Xtream — управляйте всем локально.",
        enter: "Войти",
        login: "ВХОД",
        loginHint:
          "Подписчики: войдите с именем пользователя и паролем от администратора.",
        signIn: "Войти",
        premiumTag: "Премиум IPTV-опыт",
        language: "Язык",
      },
      login: {
        subtitle: "Вход подписчика",
        username: "Имя пользователя",
        password: "Пароль",
        submit: "Войти",
        submitting: "Вход...",
        contactAdmin:
          "Нет аккаунта? Свяжитесь с администратором NADIBOX, чтобы получить доступ.",
        back: "Назад",
      },
      home: {
        logout: "Выйти",
        profile: "Профиль",
        guestMode: "Режим гостя",
        connected: "Подключено.",
        awaiting: "Ожидание синхронизации.",
        waiting: "Ожидание подключения.",
        subscriber: "Подписчик",
        expires: "Истекает",
        noExpiry: "Без срока действия",
        daysRemaining_one: "Осталось {{count}} день",
        daysRemaining_other: "Осталось {{count}} дней",
        expired: "ИСТЁК",
        timeshift: "Таймшифт",
        categories: {
          liveTv: "ТВ",
          movies: "Фильмы",
          series: "Сериалы",
          liveTvCount: "+5000 каналов",
          moviesCount: "+1200 фильмов",
          seriesCount: "+500 сериалов",
        },
        infoBar: "ТВ: +5000 каналов. ФИЛЬМЫ: +1200. СЕРИАЛЫ: +500.",
      },
      expired: {
        title: "ПОДПИСКА ИСТЕКЛА",
        hi: "Привет",
        message:
          "Ваша подписка NADIBOX закончилась. Чтобы продолжить просмотр, свяжитесь с нами в WhatsApp для продления.",
        contactWhatsapp: "Написать в WhatsApp",
        signOut: "Выйти",
        whatsappPrefill:
          "Здравствуйте, моя подписка NADIBOX ({{username}}) истекла. Хочу продлить.",
      },
      splash: {
        tagline: "Настройтесь на вселенную",
        premiumTag: "Премиум IPTV-опыт",
      },
    },
  },
  ko: {
    translation: {
      welcome: {
        title: "NADIBOX",
        chooseHowToContinue: "계속하는 방법을 선택하세요",
        guest: "게스트",
        guestHint: "자신의 Xtream 서버로 입장 — 로컬에서 모든 것을 관리하세요.",
        enter: "입장",
        login: "로그인",
        loginHint: "가입자: 관리자가 제공한 사용자 이름과 비밀번호로 로그인하세요.",
        signIn: "로그인",
        premiumTag: "프리미엄 IPTV 경험",
        language: "언어",
      },
      login: {
        subtitle: "가입자 로그인",
        username: "사용자 이름",
        password: "비밀번호",
        submit: "로그인",
        submitting: "로그인 중...",
        contactAdmin: "계정이 없으신가요? NADIBOX 관리자에게 문의하세요.",
        back: "뒤로",
      },
      home: {
        logout: "로그아웃",
        profile: "프로필",
        guestMode: "게스트 모드",
        connected: "연결됨.",
        awaiting: "서버 동기화 대기 중.",
        waiting: "연결 대기 중.",
        subscriber: "가입자",
        expires: "만료일",
        noExpiry: "만료일 없음",
        daysRemaining_one: "{{count}}일 남음",
        daysRemaining_other: "{{count}}일 남음",
        expired: "만료됨",
        timeshift: "타임시프트",
        categories: {
          liveTv: "실시간 TV",
          movies: "영화",
          series: "시리즈",
          liveTvCount: "+5000 채널",
          moviesCount: "+1200 영화",
          seriesCount: "+500 시리즈",
        },
        infoBar: "실시간: +5000 채널. 영화: +1200. 시리즈: +500.",
      },
      expired: {
        title: "구독 만료됨",
        hi: "안녕하세요",
        message:
          "NADIBOX 구독이 종료되었습니다. 시청을 계속하려면 WhatsApp으로 문의하여 갱신하세요.",
        contactWhatsapp: "WhatsApp으로 문의",
        signOut: "로그아웃",
        whatsappPrefill:
          "안녕하세요, 제 NADIBOX 구독 ({{username}})이 만료되었습니다. 갱신하고 싶습니다.",
      },
      splash: {
        tagline: "우주에 맞추세요",
        premiumTag: "프리미엄 IPTV 경험",
      },
    },
  },
  fil: {
    translation: {
      welcome: {
        title: "NADIBOX",
        chooseHowToContinue: "Pumili kung paano magpatuloy",
        guest: "BISITA",
        guestHint:
          "Pumasok gamit ang sarili mong Xtream server — pamahalaan ang lahat nang lokal.",
        enter: "Pumasok",
        login: "MAG-LOGIN",
        loginHint:
          "Mga Subscriber: mag-sign in gamit ang username at password mula sa iyong admin.",
        signIn: "Mag-Sign In",
        premiumTag: "Premium IPTV Experience",
        language: "Wika",
      },
      login: {
        subtitle: "Subscriber Sign-In",
        username: "Username",
        password: "Password",
        submit: "Mag-Sign In",
        submitting: "Nag-sa-sign in...",
        contactAdmin:
          "Walang account? Makipag-ugnayan sa iyong NADIBOX administrator.",
        back: "Bumalik",
      },
      home: {
        logout: "Mag-Log Out",
        profile: "Profile",
        guestMode: "Guest Mode",
        connected: "Nakakonekta.",
        awaiting: "Naghihintay ng server sync.",
        waiting: "Naghihintay na kumonekta.",
        subscriber: "Subscriber",
        expires: "Mag-e-expire",
        noExpiry: "Walang takdang expiry",
        daysRemaining_one: "{{count}} araw na natitira",
        daysRemaining_other: "{{count}} araw na natitira",
        expired: "EXPIRED",
        timeshift: "Timeshift",
        categories: {
          liveTv: "Live TV",
          movies: "Pelikula",
          series: "Series",
          liveTvCount: "+5000 Channel",
          moviesCount: "+1200 Pelikula",
          seriesCount: "+500 Series",
        },
        infoBar: "LIVE: +5000 Channel. PELIKULA: +1200. SERIES: +500.",
      },
      expired: {
        title: "EXPIRED ANG SUBSCRIPTION",
        hi: "Hi",
        message:
          "Natapos na ang iyong NADIBOX subscription. Makipag-ugnayan sa amin sa WhatsApp upang mag-renew.",
        contactWhatsapp: "Makipag-ugnayan sa WhatsApp",
        signOut: "Mag-Sign Out",
        whatsappPrefill:
          "Hi, expired na ang aking NADIBOX subscription ({{username}}). Gusto kong mag-renew.",
      },
      splash: {
        tagline: "I-tune in sa Sanlibutan",
        premiumTag: "Premium IPTV Experience",
      },
    },
  },
};

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    supportedLngs: LANGUAGES.map((l) => l.code),
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "nadibox_lang",
      caches: ["localStorage"],
    },
  });

// Apply RTL/LTR dir on <html>
const applyDir = (lng: string) => {
  const entry = LANGUAGES.find((l) => l.code === lng);
  if (typeof document !== "undefined") {
    document.documentElement.dir = entry?.dir ?? "ltr";
    document.documentElement.lang = lng;
  }
};
applyDir(i18n.language || "en");
i18n.on("languageChanged", applyDir);

export default i18n;
