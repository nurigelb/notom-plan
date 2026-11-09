// NoTom — Tenis · TSM Keman · AI Mühendisliği Müfredat ve Plan Verisi

const PLAN_DATA = {
  meta: {
    title: "Tenis · TSM Keman · AI Mühendisliği",
    subtitle: "Ücretsiz Kurs Planı",
    date: "9 Kas 2026",
    author: "@nurigelb",
    weeklyTotalHours: "~6–8 saat/hafta",
    summaryByCourse: [
      {
        id: "tennis",
        name: "Tenis (ev/park)",
        spine: "Feel Tennis video sınıfı (Class Central'da sıralı)",
        support: "SportsEdTV ücretsiz üyelik progresyonları + Unlock Your Serve",
        weeklyLoad: "4 × 25 dk (~1 sa 40 dk)"
      },
      {
        id: "violin",
        name: "TSM Keman",
        spine: "MEB Keman Modülü (Düzey I → IV)",
        support: "Anadolu Üni. AKADEMA 'Kemana Giriş' + YouTube TSM keman dersleri",
        weeklyLoad: "5–6 × 30 dk (~3 sa)"
      },
      {
        id: "ai",
        name: "AI Mühendisliği",
        spine: "roadmap.sh AI Engineer yol haritası",
        support: "Claude Academy + Hugging Face MCP / Agents / Context kursları",
        weeklyLoad: "2 × 60 dk + 1 × 90 dk (~3 sa 45 dk)"
      }
    ],
    rules: [
      {
        number: 1,
        title: "Geçme kriteri olmadan bir sonraki modüle geçme",
        desc: "Her modülün sonunda bir 'sınav' (geçme kriteri) var. Geçemezsen o modülü 1 hafta daha tekrarla."
      },
      {
        number: 2,
        title: "Her pazar 5 dakikalık video kaydı al",
        desc: "Tenis gölge vuruşu ve keman için pazar günleri 5 dk video çek. Öğretmensiz çalışmada tek geri bildirimin bu; bir önceki haftayla yan yana izle."
      },
      {
        number: 3,
        title: "Kötü hava planı bozmaz",
        desc: "Tenis seanslarının hepsi evde (gölge, top kontrolü, ayak çalışması) yapılabilir; park/duvar günleri bonus."
      }
    ],
    proTip: "Keman ve tenis teknik hatalarını kendin fark etmekte zorlanabilirsin. Ayda bir tek seferlik özel ders (veya bir hocaya video gönderip yorum almak) bu planın en verimli eki olur."
  },

  // Haftanın Günleri (1: Pazartesi ... 0: Pazar)
  weeklySchedule: [
    {
      dayIndex: 1,
      dayName: "Pazartesi",
      shortName: "Pzt",
      sessions: [
        {
          id: "mon-tennis",
          courseId: "tennis",
          courseTitle: "Tenis (Ev Seansı)",
          durationMinutes: 25,
          focusTitle: "Ev: Haftanın yeni videosu + gölge vuruş",
          subSteps: [
            { label: "Isınma + ayak merdiveni (bant)", minutes: 5 },
            { label: "Haftanın yeni videosu (en fazla 1 yeni video) ve gölge vuruşu", minutes: 10 },
            { label: "Top-raket kontrolü", minutes: 5 },
            { label: "Esneme / soğuma", minutes: 5 }
          ]
        },
        {
          id: "mon-violin",
          courseId: "violin",
          courseTitle: "TSM Keman",
          durationMinutes: 30,
          focusTitle: "Teknik: Yay / Gam",
          useModuleSteps: true
        }
      ]
    },
    {
      dayIndex: 2,
      dayName: "Salı",
      shortName: "Sal",
      sessions: [
        {
          id: "tue-violin",
          courseId: "violin",
          courseTitle: "TSM Keman",
          durationMinutes: 30,
          focusTitle: "Makam dizisi + dinleme",
          useModuleSteps: true
        },
        {
          id: "tue-ai",
          courseId: "ai",
          courseTitle: "AI Mühendisliği",
          durationMinutes: 60,
          focusTitle: "60 dk: Kursun sıradaki dersi",
          subSteps: [
            { label: "Aktif modülün sıradaki kurs videosu / okuma materyali", minutes: 30 },
            { label: "Kodlama pratiği ve not alma (uygulamalı deneme)", minutes: 30 }
          ]
        }
      ]
    },
    {
      dayIndex: 3,
      dayName: "Çarşamba",
      shortName: "Çar",
      sessions: [
        {
          id: "wed-tennis",
          courseId: "tennis",
          courseTitle: "Tenis (Ev Seansı)",
          durationMinutes: 25,
          focusTitle: "Ev: Ayak merdiveni + top-raket kontrolü",
          subSteps: [
            { label: "Isınma + ayak merdiveni (quickstep / split-step)", minutes: 5 },
            { label: "Aktif modül gölge vuruş tekrarı (ayna/telefon karşısında)", minutes: 10 },
            { label: "Top-raket kontrolü & sektirme drilleri", minutes: 5 },
            { label: "Esneme / soğuma", minutes: 5 }
          ]
        },
        {
          id: "wed-violin",
          courseId: "violin",
          courseTitle: "TSM Keman",
          durationMinutes: 30,
          focusTitle: "Etüt çalışması",
          useModuleSteps: true
        }
      ]
    },
    {
      dayIndex: 4,
      dayName: "Perşembe",
      shortName: "Per",
      sessions: [
        {
          id: "thu-violin",
          courseId: "violin",
          courseTitle: "TSM Keman",
          durationMinutes: 30,
          focusTitle: "Etüt / Eser çalışması",
          useModuleSteps: true
        },
        {
          id: "thu-ai",
          courseId: "ai",
          courseTitle: "AI Mühendisliği",
          durationMinutes: 60,
          focusTitle: "60 dk: Kursun sıradaki dersi",
          subSteps: [
            { label: "Aktif modülün sıradaki dersi / ünitesi", minutes: 30 },
            { label: "Uygulama: Kod yazımı ve örnek çalıştırma", minutes: 30 }
          ]
        }
      ]
    },
    {
      dayIndex: 5,
      dayName: "Cuma",
      shortName: "Cum",
      sessions: [
        {
          id: "fri-tennis",
          courseId: "tennis",
          courseTitle: "Tenis (Park/Duvar veya Ev)",
          durationMinutes: 25,
          hasWeatherToggle: true,
          focusTitle: "Hava iyiyse park/duvar, değilse ev gölge seansı",
          subSteps: [
            { label: "Isınma + ayak merdiveni / split-step", minutes: 5 },
            { label: "Duvar çalışması veya Ev gölge vuruş seansı (aktif modül)", minutes: 10 },
            { label: "Top-raket kontrolü / duvar hedef çalışması", minutes: 5 },
            { label: "Esneme / soğuma", minutes: 5 }
          ]
        },
        {
          id: "fri-violin",
          courseId: "violin",
          courseTitle: "TSM Keman",
          durationMinutes: 30,
          focusTitle: "Eser + Kayıt denemesi",
          useModuleSteps: true
        }
      ]
    },
    {
      dayIndex: 6,
      dayName: "Cumartesi",
      shortName: "Cmt",
      sessions: [
        {
          id: "sat-tennis",
          courseId: "tennis",
          courseTitle: "Tenis (Bonus Kort/Duvar veya Ev)",
          durationMinutes: 25,
          isBonus: true,
          hasWeatherToggle: true,
          focusTitle: "Hava iyiyse kort/duvar (bonus)",
          subSteps: [
            { label: "Dinamik ısınma + ayak işi", minutes: 5 },
            { label: "Kort/Duvar modül pratiği (veya evde gölge senaryo)", minutes: 15 },
            { label: "Esneme", minutes: 5 }
          ]
        },
        {
          id: "sat-violin",
          courseId: "violin",
          courseTitle: "TSM Keman",
          durationMinutes: 30,
          focusTitle: "Serbest: Sevdiğin eser veya taksim denemesi",
          subSteps: [
            { label: "Boş tel / makam dizisi ısınması", minutes: 5 },
            { label: "Sevdiğin bir TSM eseri veya serbest taksim denemesi", minutes: 20 },
            { label: "Makam taksimi / saz semaisi dinleme", minutes: 5 }
          ]
        },
        {
          id: "sat-ai",
          courseId: "ai",
          courseTitle: "AI Mühendisliği",
          durationMinutes: 90,
          focusTitle: "90 dk: Ay sonu projesi (GitHub)",
          subSteps: [
            { label: "Proje mimarisi & sıradaki özelliğin planlanması", minutes: 15 },
            { label: "Derin kodlama bloğu (Ay sonu GitHub projesi)", minutes: 60 },
            { label: "Test, Git commit & README güncellemesi", minutes: 15 }
          ]
        }
      ]
    },
    {
      dayIndex: 0,
      dayName: "Pazar",
      shortName: "Paz",
      sessions: [
        {
          id: "sun-tennis-video",
          courseId: "tennis",
          courseTitle: "Tenis Video Kaydı",
          durationMinutes: 5,
          focusTitle: "5 dk video kaydı (Gölge vuruş & geçen haftayla yan yana izleme)",
          subSteps: [
            { label: "Telefonu sabitle, aktif modülün gölge vuruşunu kaydet ve geçen haftayla karşılaştır", minutes: 5 }
          ]
        },
        {
          id: "sun-violin-video",
          courseId: "violin",
          courseTitle: "Keman Video Kaydı",
          durationMinutes: 5,
          focusTitle: "5 dk video kaydı (Yay tutuşu, entonasyon & geçen haftayla karşılaştırma)",
          subSteps: [
            { label: "Aktif modülün gam/etüt veya eserini kaydet ve geçen haftayla karşılaştır", minutes: 5 }
          ]
        },
        {
          id: "sun-review",
          courseId: "ai",
          courseTitle: "Haftalık Gözden Geçirme",
          durationMinutes: 15,
          focusTitle: "15 dk: Kontrol listesini işaretle & geçme kriterlerini değerlendir",
          subSteps: [
            { label: "Haftanın seanslarını gözden geçir, modül sınavlarını kontrol et ve yeni haftayı planla", minutes: 15 }
          ]
        }
      ]
    }
  ],

  // 3 Ana Kurs ve Modülleri
  courses: {
    tennis: {
      id: "tennis",
      title: "Kurs 1 — Tenis (Ev / Park)",
      badge: "4 × 25 dk / hafta",
      color: "#84cc16",
      equipment: "Raket, 2–3 top, ayna veya telefon, yere bant (ayak merdiveni için). Park günü: bir duvar.",
      sessionTemplateNote: "Her ev seansının şablonu: 5 dk ısınma + ayak merdiveni → 10 dk o haftanın videosu ve gölge vuruşu → 5 dk top-raket kontrolü → 5 dk esneme. Korta gidebildiğin günler, o haftanın modülünü topla dene.",
      links: [
        {
          title: "Feel Tennis – Forehand Sınıfı (Class Central, 36 Video)",
          url: "https://classcentral.com/classroom/youtube-tennis-forehand-technique-drills-and-tips-54490",
          tag: "Ana Ders"
        },
        {
          title: "Feel Tennis – Unlock Your Serve Çalışma Programı",
          url: "https://simonvdm.github.io/feeltennis/unlock_your_serve.html",
          tag: "Servis"
        },
        {
          title: "SportsEdTV – Tenis Progresyonları (Ücretsiz Üyelik)",
          url: "https://sportsedtv.com/sport/tennis-instructional-videos/forehand-progression-1-feel-roll",
          tag: "Destek"
        }
      ],
      modules: [
        {
          id: "tennis-m1",
          period: "Hafta 1–2",
          title: "Grip, hazır duruş, split-step",
          homeSession: "Feel Tennis forehand sınıfı 1–4. videolar; 3×20 split-step + yan adım",
          parkWallSession: "Topu raketle 50 kez sektirme",
          passCriteria: "Videoda split-step'in topa vurmadan önce geldiği görülüyor"
        },
        {
          id: "tennis-m2",
          period: "Hafta 3–4",
          title: "Forehand gölge vuruşu",
          homeSession: "Videolar 5–12; aynada 3 set × 20 yavaş + 20 normal hız, bitişte 3 sn dur",
          parkWallSession: "Duvara 4–6 m'den yumuşak forehand",
          passCriteria: "Duvara 20 ardışık kontrollü forehand"
        },
        {
          id: "tennis-m3",
          period: "Hafta 5–6",
          title: "Backhand + kinetik zincir",
          homeSession: "Videolar 13–20; gölge backhand, kalça-omuz dönüşü; bant merdivende quickstep/in-out",
          parkWallSession: "Duvara backhand, sonra FH/BH karışık",
          passCriteria: "Duvara 15 ardışık backhand"
        },
        {
          id: "tennis-m4",
          period: "Hafta 7–8",
          title: "Servis temeli",
          homeSession: "Unlock Your Serve rutini: 10 top fırlatma, poşet sallama, gölge servis",
          parkWallSession: "Duvarda servis hedefi işaretle",
          passCriteria: "10 fırlatmadan 8'i aynı noktaya düşüyor"
        },
        {
          id: "tennis-m5",
          period: "Hafta 9–10",
          title: "Vole ve el-göz refleksi",
          homeSession: "Videolar 21–28; kısa mesafe duvar volesi, top-raket kontrolü",
          parkWallSession: "Duvara 2 m'den vole",
          passCriteria: "30 ardışık vole"
        },
        {
          id: "tennis-m6",
          period: "Hafta 11–12",
          title: "Maç ayak işi + birleştirme",
          homeSession: "Videolar 29–36; gölge senaryo: split-step → yan adım → FH → geri dönüş (10 tekrar)",
          parkWallSession: "Duvarda FH/BH/vole rally",
          passCriteria: "5 dk hatasız duvar rallisi; 12. hafta videosunu 1. hafta ile karşılaştır"
        }
      ]
    },

    violin: {
      id: "violin",
      title: "Kurs 2 — Türk Sanat Müziği Keman",
      badge: "5–6 × 30 dk / hafta",
      color: "#f59e0b",
      equipment: "Keman, yay, reçine, metronom (uygulama içi 60 BPM mevcut), komalı perdeler için akortçu (tuner) uygulaması.",
      sessionTemplateNote: "Dinleme ödevi: Her makam haftasında o makamdan 2 taksim/saz semaisi dinle (YouTube'da '<makam> keman taksimi'). Komalı perdelerde (Rast'taki segâh, Uşşak'taki eviç vb.) bir akortçu uygulaması kullan ve aynı perdeyi her gün aynı yerde bulana kadar tekrar et.",
      links: [
        {
          title: "MEB Keman Modülü PDF (Düzey I → IV)",
          url: "https://mufredat.meb.gov.tr/Dosyalar/202681495321336-Keman%20Mod%C3%BCl%C3%BC.pdf",
          tag: "Omurga"
        },
        {
          title: "AKADEMA – Kemana Giriş (Anadolu Üni. / OpenupEd)",
          url: "https://openuped.eu/courses/details/4/308-introduction-to-violin",
          tag: "Düzey I"
        },
        {
          title: "Gökhan Faruk Ünal – Keman İçin Türk Müziği Dersleri 1",
          url: "https://www.youtube.com/watch?v=mOmfjEaHNMI",
          tag: "Ses Sistemi & Komalar"
        },
        {
          title: "Hakan Çakır – Ders 1: Batı–Türk Karşılaştırması",
          url: "https://www.youtube.com/watch?v=GR8Jpu37Jf0",
          tag: "Ses Sistemi"
        },
        {
          title: "Makam Dersi 1 – 4'lü ve 5'liler",
          url: "https://www.youtube.com/watch?v=k6LulSVvziM",
          tag: "Makam Kuramı"
        },
        {
          title: "Türk Müziği Keman Dersleri 1. Bölüm – Rast",
          url: "https://www.youtube.com/watch?v=zY_-NkKjyw4",
          tag: "Makam Uygulama"
        },
        {
          title: "Türk Müziği Keman Dersi 1 – Glissando, Çarpma",
          url: "https://www.youtube.com/watch?v=st6gzkpi7Yg",
          tag: "Tavır"
        }
      ],
      modules: [
        {
          id: "violin-m1",
          period: "Ay 1–2",
          level: "MEB Düzey I (Bölüm 1)",
          title: "Duruş, tutuş, akort; yay bölümleri; legato / detaşe / staccato",
          dailyRoutine: "AKADEMA dersleri; 15 dk boş tellerde tam yay, 15 dk ders ödevi",
          subSteps: [
            { label: "Boş tellerde tam yay (Metronom 60 BPM ile düz yay)", minutes: 15 },
            { label: "AKADEMA ders videosu ve ödev çalışması", minutes: 15 }
          ],
          passCriteria: "Metronom 60'ta 4 tel boyunca düz, cızırtısız tam yay"
        },
        {
          id: "violin-m2",
          period: "Ay 3–4",
          level: "MEB Düzey I (Bölüm 2)",
          title: "1. pozisyonda Mi, La, Re, Sol tellerindeki doğal sesler; tel geçişleri; gamlar",
          dailyRoutine: "10 dk gam, 15 dk etüt, 5 dk kulaktan basit ezgi",
          subSteps: [
            { label: "1. pozisyon doğal sesler ve Gam çalışması (Do majör / La minör)", minutes: 10 },
            { label: "MEB Düzey I etüt çalışması ve tel geçişleri", minutes: 15 },
            { label: "Kulaktan basit ezgi çıkarma", minutes: 5 }
          ],
          passCriteria: "Do majör ve La minör gamları akortlu, tel geçişleri temiz"
        },
        {
          id: "violin-m3",
          period: "Ay 5–6",
          level: "MEB Düzey II (Bölüm 1)",
          title: "Komalar ve perde isimleri; çarpma süslemesi; ajilite; Kürdi, Rast, Mahur dizileri",
          dailyRoutine: "Gökhan Faruk Ünal + Makam Dersi 1; 10 dk çarpma etüdü, 15 dk makam dizisi (çıkış-iniş), 5 dk dinleme",
          subSteps: [
            { label: "Çarpma süslemesi ve ajilite etüdü", minutes: 10 },
            { label: "Makam dizisi (Kürdi, Rast, Mahur çıkış-iniş — akortçu ile)", minutes: 15 },
            { label: "Gökhan Faruk Ünal / Makam Dersi + taksim dinleme", minutes: 5 }
          ],
          passCriteria: "Rast'ta segâh perdesini (Si koma bemol) akortçuyla tutarlı basmak; 3 makamın durak ve güçlüsünü söyleyebilmek"
        },
        {
          id: "violin-m4",
          period: "Ay 7–9",
          level: "MEB Düzey II (Bölüm 2)",
          title: "Kürdi, Rast, Mahur etüt ve eser",
          dailyRoutine: "Rast serisi videoları; her makamdan 1 etüt + 1 kısa saz eseri",
          subSteps: [
            { label: "Makam dizisi ısınma + glissando/çarpma tavrı", minutes: 10 },
            { label: "Makam etüdü ve kısa saz eseri çalışması", minutes: 15 },
            { label: "O makamdan taksim / saz semaisi dinleme", minutes: 5 }
          ],
          passCriteria: "Her makamdan 1 eseri baştan sona kayıt"
        },
        {
          id: "violin-m5",
          period: "Ay 10–12",
          level: "MEB Düzey III",
          title: "Çift çarpma, gürlük (dinamik); Hüseyni, Buselik, Uşşak, Segâh",
          dailyRoutine: "Aynı şablon: dizi → etüt → eser",
          subSteps: [
            { label: "Çift çarpma, gürlük (dinamik) ve makam dizisi", minutes: 10 },
            { label: "Hüseyni, Buselik, Uşşak, Segâh etüt ve eser", minutes: 15 },
            { label: "Seyir analizi ve taksim dinleme", minutes: 5 }
          ],
          passCriteria: "Uşşak ve Hüseyni'yi ayırt ederek seyirleriyle çalmak"
        },
        {
          id: "violin-m6",
          period: "Ay 13+",
          level: "MEB Düzey IV",
          title: "MEB modülünün son düzeyi (daha ileri makamlar ve icra)",
          dailyRoutine: "Aynı şablon + kısa taksim denemeleri",
          subSteps: [
            { label: "İleri makam dizisi ve seyir çalışması", minutes: 10 },
            { label: "Saz eseri icrası", minutes: 10 },
            { label: "Serbest taksim denemeleri", minutes: 10 }
          ],
          passCriteria: "Bir makamda 1 dk serbest taksim kaydı"
        }
      ]
    },

    ai: {
      id: "ai",
      title: "Kurs 3 — AI / Agentic Mühendisliği",
      badge: "2×60 dk + 1×90 dk / hafta",
      color: "#38bdf8",
      equipment: "Bilgisayar, Python, Git, GitHub hesabı, Claude / Hugging Face hesapları.",
      sessionTemplateNote: "Önkoşul: Python ve Git'e rahat değilsen 1. aydan önce 2 hafta MIT'nin ücretsiz 'The Missing Semester' dersleriyle (terminal, Git, editör) başla. Her ayın sonunda bir proje GitHub'a çıkar.",
      links: [
        {
          title: "roadmap.sh – AI Engineer Yol Haritası",
          url: "https://roadmap.sh/ai-engineer",
          tag: "Omurga"
        },
        {
          title: "roadmap.sh – AI Engineer Projeleri",
          url: "https://roadmap.sh/ai-engineer/projects",
          tag: "Proje Fikirleri"
        },
        {
          title: "Claude Academy (API, MCP, Agent Skills, Claude Code)",
          url: "https://academy.claude.com",
          tag: "Sertifikalı Kurs"
        },
        {
          title: "Hugging Face MCP Course",
          url: "https://huggingface.co/learn/mcp-course/unit0/introduction",
          tag: "Sertifikalı Kurs"
        },
        {
          title: "Hugging Face Agents Course",
          url: "https://huggingface.co/agents-course",
          tag: "Sertifikalı Kurs"
        },
        {
          title: "Hugging Face Context Course",
          url: "https://huggingface.co/context-course",
          tag: "Context Eng."
        },
        {
          title: "MIT – The Missing Semester (Önkoşul: Terminal & Git)",
          url: "https://missing.csail.mit.edu/",
          tag: "Önkoşul"
        }
      ],
      modules: [
        {
          id: "ai-m1",
          period: "Ay 1",
          title: "Temel: LLM, token, API",
          lessons: "roadmap.sh giriş düğümleri → Claude Academy 'Building with the Claude API'",
          passCriteria: "Komut satırından çalışan, streaming ve tool use içeren küçük bir sohbet botu (GitHub)"
        },
        {
          id: "ai-m2",
          period: "Ay 2",
          title: "MCP (Model Context Protocol)",
          lessons: "Claude Academy 'Introduction to MCP' → 'MCP Advanced' → HF MCP Course Ünite 1–3",
          passCriteria: "Kendi verine (ör. SQLite veya notların) erişen tip-güvenli bir MCP sunucusu; HF MCP sertifikası"
        },
        {
          id: "ai-m3",
          period: "Ay 3",
          title: "Ajanlar (AI Agents)",
          lessons: "HF Agents Course Ünite 1–4",
          passCriteria: "Plan yapan ve 2+ araç kullanan bir ajan; HF Agents sertifikası"
        },
        {
          id: "ai-m4",
          period: "Ay 4",
          title: "Embedding, RAG, değerlendirme (evals)",
          lessons: "roadmap.sh RAG + vektör DB düğümleri; HF Agents bonus ünitesi (observability + evals)",
          passCriteria: "PDF'lerin üzerinde RAG; 20 soruluk test seti ile doğruluk ölçümü"
        },
        {
          id: "ai-m5",
          period: "Ay 5",
          title: "Context engineering ve kod ajanları",
          lessons: "Claude Academy 'Agent Skills' + 'Claude Code in Action' → HF Context Course",
          passCriteria: "Bir MCP sunucusu + skill + ajan birleşik portföy projesi, README ve demo videosu"
        },
        {
          id: "ai-m6",
          period: "Ay 6",
          title: "Güvenlik ve üretim (Safety & Production)",
          lessons: "roadmap.sh AI Safety düğümü (prompt injection, guardrail)",
          passCriteria: "5. ay projesine prompt injection testleri ve rate limit ekle"
        }
      ]
    }
  },

  firstMonthChecklist: [
    {
      id: "chk-1",
      courseId: "tennis",
      text: "Feel Tennis sınıfının 1–4. videolarını izle, split-step videosunu kaydet"
    },
    {
      id: "chk-2",
      courseId: "tennis",
      text: "Duvara 20 ardışık kontrollü forehand"
    },
    {
      id: "chk-3",
      courseId: "violin",
      text: "AKADEMA 'Kemana Giriş' kaydını yap ve ilk 2 haftalık dersleri bitir"
    },
    {
      id: "chk-4",
      courseId: "violin",
      text: "Metronom 60'ta boş tellerde düz tam yay"
    },
    {
      id: "chk-5",
      courseId: "ai",
      text: "Claude Academy'ye kayıt ol, 'Building with the Claude API' kursunu bitir"
    },
    {
      id: "chk-6",
      courseId: "ai",
      text: "Streaming + tool use içeren sohbet botunu GitHub'a yükle"
    }
  ]
};

