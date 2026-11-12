// NoTom — Tenis (Kortsuz Park+Ev) · TSM Keman (Hohmann & Wohlfahrt) · AI Mühendisliği Verisi
// Çalışanlar İçin Optimize Edilmiş Hafif Program: Günde 1 Görev (~25-45 dk), Çarşamba Tam Dinlenme/Boş.

const PLAN_DATA = {
  meta: {
    title: "Tenis · TSM Keman · AI Mühendisliği",
    subtitle: "Hafifletilmiş Kurs Planı (Günde 1 Görev, Çarşamba Boş)",
    date: "11 Kas 2026",
    author: "@nurigelb",
    weeklyTotalHours: "~3,5 - 4 saat/hafta",
    rules: [
      {
        number: 1,
        title: "Günde sadece 1 odak görevi",
        desc: "İş çıkışı saat 18:00'den sonra yorulmadan sürdürülebilmesi için her güne tek bir odak seansı konuldu. Çarşamba günleri tamamen boş."
      },
      {
        number: 2,
        title: "Geçme kriteri olmadan bir sonraki modüle geçme",
        desc: "Her modülün sonunda bir 'sınav' var. Geçemezsen o modülü 1 hafta daha tekrarla."
      },
      {
        number: 3,
        title: "Her pazar 5 dakikalık video kaydı al",
        desc: "Tenis gölge vuruşu ve keman için pazar 5 dk video çek. Öğretmensiz çalışmada tek geri bildirimin bu; bir önceki haftayla yan yana izle."
      },
      {
        number: 4,
        title: "Kötü hava planı bozmaz",
        desc: "Yağmurda park seansı yerine evde 10 dakikalık hız devresi + C seansı yap; sıçramaları ıslak zeminde yapma."
      }
    ],
    proTip: "Hafta içi seansları 25-40 dk aralığında tutuldu. Çarşamba günün tamamen sana ait. Eğer bir gün yorgun olursan 'Ertele' butonuyla görevi Cumartesi veya Pazar gününe kaydırabilirsin."
  },

  // Haftalık Program (Günde 1 Görev, Çarşamba Boş)
  weeklySchedule: [
    {
      dayIndex: 1,
      dayName: "Pazartesi",
      shortName: "Pzt",
      sessions: [
        {
          id: "mon-violin",
          courseId: "violin",
          courseTitle: "TSM Keman",
          durationMinutes: 30,
          focusTitle: "Hohmann + Boş Tel (Haftanın Açılışı)",
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
          id: "tue-tennis",
          courseId: "tennis",
          sessionType: "A",
          hasWeatherToggle: true,
          courseTitle: "Tenis (A — Park)",
          durationMinutes: 40,
          focusTitle: "A — Park: Patlayıcılık + Sprint",
          subSteps: [
            { label: "Isınma: Hafif koşu, dinamik esneme, 2 dk ip", minutes: 8 },
            { label: "Aktif fazın plyometri / patlayıcılık setleri (1,5–2 dk dinlenmeli)", minutes: 20 },
            { label: "Split-step'ten 10 m sprint tekrarları", minutes: 7 },
            { label: "Soğuma ve esneme (Ağrı varsa sıçramaları kes)", minutes: 5 }
          ],
          rainySubSteps: [
            { label: "Coach 10 dk Hızlı Ev Devresi (5 hareket, 20 sn × 4 tur)", minutes: 10 },
            { label: "C Seansı: Haftanın videosu + aynada gölge vuruş", minutes: 10 },
            { label: "C Seansı: Sünger topla duvar volesi + top kontrolü", minutes: 15 }
          ]
        }
      ]
    },
    {
      dayIndex: 3,
      dayName: "Çarşamba",
      shortName: "Çar",
      restNote: "Planlı boş gün (Dolu günler için dinlenme)",
      sessions: []
    },
    {
      dayIndex: 4,
      dayName: "Perşembe",
      shortName: "Per",
      sessions: [
        {
          id: "thu-ai",
          courseId: "ai",
          courseTitle: "AI Mühendisliği",
          durationMinutes: 45,
          focusTitle: "45 dk: Kursun Sıradaki Dersi",
          subSteps: [
            { label: "Aktif modülün sıradaki ders videosu / okuması", minutes: 25 },
            { label: "Uygulamalı kod yazımı ve deneme", minutes: 20 }
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
          sessionType: "C",
          courseTitle: "Tenis (C — Ev)",
          durationMinutes: 25,
          focusTitle: "C — Ev: Gölge Vuruş + Sünger Top Volesi",
          subSteps: [
            { label: "Haftanın Feel Tennis videosu ve aynada gölge vuruş", minutes: 10 },
            { label: "Sünger topla duvar volesi (1–2 m mesafe, bantlı hedef kareleri)", minutes: 10 },
            { label: "Raketle top sektirme ve kontrol", minutes: 5 }
          ]
        }
      ]
    },
    {
      dayIndex: 6,
      dayName: "Cumartesi",
      shortName: "Cmt",
      sessions: [
        {
          id: "sat-ai",
          courseId: "ai",
          courseTitle: "AI Mühendisliği",
          durationMinutes: 60,
          focusTitle: "60 dk: Ay Sonu Projesi / Pratik Kodlama",
          subSteps: [
            { label: "Proje mimarisi ve görev planı", minutes: 10 },
            { label: "GitHub projesi için kodlama bloğu", minutes: 40 },
            { label: "Git commit, test ve dokümantasyon", minutes: 10 }
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
          id: "sun-violin",
          courseId: "violin",
          courseTitle: "TSM Keman & Video",
          durationMinutes: 35,
          focusTitle: "30 dk TSM Keman + 5 dk Karşılaştırma Videosu",
          subSteps: [
            { label: "Makam dizisi ısınması ve Hohmann / Wohlfahrt etüdü", minutes: 20 },
            { label: "Sevdiğin bir TSM eseri veya serbest taksim denemesi", minutes: 10 },
            { label: "5 dk gelişim videosu kaydet (keman ve tenis gölge)", minutes: 5 }
          ]
        }
      ]
    }
  ],

  // 3 Ana Kurs ve Modülleri
  courses: {
    tennis: {
      id: "tennis",
      title: "Kurs 1 — Tenis (Kortsuz: Park + Ev)",
      badge: "Haftada 2 Seans (Salı Park, Cuma Ev)",
      equipment: "Raket, sünger top, atlama ipi (varsa), işaret olarak 4–5 şişe ya da ayakkabı, yere bant, kronometre.",
      sessionTemplateNote: "Salı günleri dışarıda park/plyometri (40 dk), Cuma günleri evde gölge vuruş ve sünger topla duvar volesi (25 dk). Yağmurda park seansı yerine evde 10 dk hız devresi + C seansı yap.",
      links: [
        {
          title: "Feel Tennis – Forehand Sınıfı (Class Central, 36 Video)",
          url: "https://classcentral.com/classroom/youtube-tennis-forehand-technique-drills-and-tips-54490",
          tag: "Gölge Teknik (C)"
        },
        {
          title: "USTA – Küçük Alanda Ayak İşi Drilleri",
          url: "https://www.playerdevelopment.usta.com/Improve-Your-Game/Sport-Science/116188_Technique_Footwork_Drills_for_Tennis_Players_on_the_Road",
          tag: "Ayak İşi (B)"
        },
        {
          title: "Evolution PT – Tenisçi İçin Plyometri",
          url: "https://www.evolutionphysicaltherapy.com/post/plyometric-training-to-improve-agility-for-the-tennis-player/",
          tag: "Patlayıcılık (A)"
        },
        {
          title: "Coach – 10 Dakikalık Ev Hız ve Çeviklik Antrenmanı",
          url: "https://coachweb.com/sport/home-tennis-workout-to-develop-speed-and-agility",
          tag: "Yağmurlu Gün / Ev"
        }
      ],
      modules: [
        {
          id: "tennis-m1",
          period: "Hafta 1–4",
          title: "Faz 1: Temel kuvvet + hafif plyometri",
          sessionA: "Squat 3×12, geri lunge 3×10, tek ayak kalça köprüsü 3×10, baldır 3×15; pogo sıçrama 3×20, yerinde split-step 3×10 (~60–80 temas)",
          sessionB: "Banttan merdivende quickstep ve in-out, yan adım 4×10 m",
          sessionC: "Videolar 1–12; FH vole 3×20, BH vole 3×20 (sünger topla duvar volesi)",
          passCriteria: "30 ardışık vole; tek ayakta 30 sn sabit denge"
        },
        {
          id: "tennis-m2",
          period: "Hafta 5–8",
          title: "Faz 2: Plyometri",
          sessionA: "Squat jump 3×6, yana sıçrama (skater) her yöne 3×6, çizgi üstünden yana sıçrama 3×5, uzun atlama 3×4 (~80–100 temas); 10 m sprint 6×",
          sessionB: "5-10-5 mekik 6×, örümcek drili 4×",
          sessionC: "Videolar 13–24; FH/BH karışık vole, yarım vole; tavan yeterliyse gölge servis",
          passCriteria: "5-10-5 süren 1. haftaya göre iyileşmiş; 50 ardışık karışık vole"
        },
        {
          id: "tennis-m3",
          period: "Hafta 9–12",
          title: "Faz 3: Tenise özgü güç + reaksiyon",
          sessionA: "Split-squat jump her bacak 3×5, tek ayak yana sıçrama 3×5, sırt çantasıyla (5–8 kg) rotasyonel chop 3×10 (~100–120 temas)",
          sessionB: "Reaksiyonla yön değiştirme (telefonda rastgele sesli komut veya arkadaşın işareti), gölge puan 8×30 sn",
          sessionC: "Videolar 25–36; reaksiyon volesi (rastgele FH/BH), hedef karelere vole",
          passCriteria: "5 dk düşürmeden duvar volesi; 12. hafta videosunu 1. haftayla karşılaştır"
        }
      ]
    },

    violin: {
      id: "violin",
      title: "Kurs 2 — TSM Keman (Notalı: Hohmann & Wohlfahrt)",
      badge: "Haftada 2 Seans (Pazartesi 30 dk, Pazar 35 dk)",
      equipment: "Keman, yay, Hohmann Kitap 1 PDF, Wohlfahrt Op. 45 PDF, metronom (60 BPM), akortçu.",
      sessionTemplateNote: "Pazartesi teknik temel (Hohmann + boş tel), Pazar günü makam/eser pratiği ve 5 dakikalık gelişim videosu kaydı.",
      links: [
        {
          title: "Hohmann – Praktische Violinschule (IMSLP Notalı PDF)",
          url: "https://imslp.org/wiki/Praktische_Violinschule_(Hohmann,_Christian_Heinrich)",
          tag: "Ana Metot"
        },
        {
          title: "Wohlfahrt – 60 Etüt Op. 45 (IMSLP PDF)",
          url: "https://imslp.org/wiki/60_Studies_for_the_Violin,_Op.45_(Wohlfahrt,_Franz)",
          tag: "Etüt Kitabı"
        },
        {
          title: "TRT Nota Arşivi (Ücretsiz TSM Notaları)",
          url: "http://www.trtnotaarsivi.com/",
          tag: "TSM Nota"
        },
        {
          title: "notaarsivleri.com (TSM Saz Eserleri)",
          url: "http://notaarsivleri.com/index.html",
          tag: "TSM Nota"
        },
        {
          title: "AKADEMA – Kemana Giriş (Anadolu Üni.)",
          url: "https://openuped.eu/courses/details/4/308-introduction-to-violin",
          tag: "Duruş & Yay"
        },
        {
          title: "Gökhan Faruk Ünal – Keman İçin Türk Müziği Dersleri 1",
          url: "https://www.youtube.com/watch?v=mOmfjEaHNMI",
          tag: "Ses Sistemi & Koma"
        },
        {
          title: "Makam Dersi 1 – 4'lü ve 5'liler",
          url: "https://www.youtube.com/watch?v=k6LulSVvziM",
          tag: "Makam Kuramı"
        },
        {
          title: "Türk Müziği Keman Dersleri – Rast",
          url: "https://www.youtube.com/watch?v=zY_-NkKjyw4",
          tag: "Rast"
        },
        {
          title: "Türk Müziği Keman Dersi 1 – Glissando ve Çarpma",
          url: "https://www.youtube.com/watch?v=st6gzkpi7Yg",
          tag: "Tavır"
        }
      ],
      modules: [
        {
          id: "violin-m1",
          period: "Ay 1",
          level: "Hohmann K1 No. 1–30",
          title: "Boş teller, Mi teli başlangıcı; AKADEMA duruş + Ses sistemi & koma işaretleri",
          dailyRoutine: "15 dk Hohmann (No. 1–30), 10 dk boş telde uzun yay, 5 dk ses sistemi videosu / dinleme",
          subSteps: [
            { label: "Hohmann Kitap 1 (No. 1–30) çalışması", minutes: 15 },
            { label: "Boş telde uzun ve düz yay (Metronom 60 BPM)", minutes: 10 },
            { label: "Ses sistemi videosu (perde isimleri, koma işaretleri) / dinleme", minutes: 5 }
          ],
          passCriteria: "Hohmann No. 30 metronom 60'ta temiz ve düz yayla"
        },
        {
          id: "violin-m2",
          period: "Ay 2",
          level: "Hohmann K1 No. 31–99",
          title: "Mi ve La telleri + Makam Dersi 1 (4'lü-5'liler) ve Rast dizisi",
          dailyRoutine: "15 dk Hohmann (No. 31–99), 10 dk Rast dizisi çıkış-iniş (Sol'den), 5 dk dinleme",
          subSteps: [
            { label: "Hohmann Kitap 1 (No. 31–99: Mi ve La telleri)", minutes: 15 },
            { label: "Rast dizisi çıkış-iniş (Sol'den, segâh perdesini akortçuyla kontrol et)", minutes: 10 },
            { label: "Makam Dersi 1 / Rast taksim dinleme", minutes: 5 }
          ],
          passCriteria: "Rast'ın segâh perdesini akortçuyla her gün aynı yerde basmak"
        },
        {
          id: "violin-m3",
          period: "Ay 3",
          level: "Hohmann K1 No. 100–155",
          title: "Re ve Sol telleri + Kürdi ve Uşşak dizileri, çarpma videosu",
          dailyRoutine: "15 dk Hohmann (No. 100–155), 10 dk Kürdi/Uşşak dizi + çarpma, 5 dk dinleme",
          subSteps: [
            { label: "Hohmann Kitap 1 (No. 100–155: Re ve Sol telleri)", minutes: 15 },
            { label: "Kürdi ve Uşşak dizileri + çarpma süslemesi", minutes: 10 },
            { label: "Çarpma dersi videosu / makam dinleme", minutes: 5 }
          ],
          passCriteria: "Hohmann Kitap 1 bitti; 3 dizi (Rast, Kürdi, Uşşak) ezbere"
        },
        {
          id: "violin-m4",
          period: "Ay 4–5",
          level: "Wohlfahrt Op. 45 No. 1–10",
          title: "Hüseyni, Mahur, Nihavend dizileri + TRT arşivinden kısa saz eserleri",
          dailyRoutine: "10 dk dizi, 10 dk Wohlfahrt etüt (No. 1–10), 10 dk kısa saz eseri (sirto/longa)",
          subSteps: [
            { label: "Hüseyni, Mahur, Nihavend makam dizileri", minutes: 10 },
            { label: "Wohlfahrt Op. 45 (No. 1–10) etüt çalışması", minutes: 10 },
            { label: "TRT arşivinden kısa saz eseri (sirto, longa veya şarkı saz kısmı)", minutes: 10 }
          ],
          passCriteria: "Bir eseri baştan sona video kaydı"
        },
        {
          id: "violin-m5",
          period: "Ay 6–8",
          level: "Wohlfahrt Op. 45 No. 11–30",
          title: "Hicaz, Buselik, Segâh; çift çarpma, glissandolu geçişler",
          dailyRoutine: "10 dk dizi + çift çarpma/glissando, 10 dk Wohlfahrt (No. 11–30), 10 dk eser",
          subSteps: [
            { label: "Hicaz, Buselik, Segâh dizileri + çift çarpma ve glissando", minutes: 10 },
            { label: "Wohlfahrt Op. 45 (No. 11–30) etüt çalışması", minutes: 10 },
            { label: "TSM eseri ve seyir/taksim çalışması", minutes: 10 }
          ],
          passCriteria: "Hicaz veya Uşşak'ta seyrine uygun 1 dk taksim denemesi"
        },
        {
          id: "violin-m6",
          period: "Ay 9+",
          level: "Hohmann K2–3 · Wohlfahrt No. 31–60",
          title: "Saz semaisi bölümleri ve makam geçkileri",
          dailyRoutine: "10 dk makam geçkileri, 10 dk ileri etüt, 10 dk saz semaisi",
          subSteps: [
            { label: "Makam geçkileri ve dizi çalışması", minutes: 10 },
            { label: "Hohmann K2–3 / Wohlfahrt No. 31–60 etüt", minutes: 10 },
            { label: "Saz semaisi (1. hane ve teslim) icrası", minutes: 10 }
          ],
          passCriteria: "Bir saz semaisinin 1. hanesini kayıtla çalmak"
        }
      ]
    },

    ai: {
      id: "ai",
      title: "Kurs 3 — AI / Agentic Mühendisliği",
      badge: "Haftada 2 Seans (Perşembe 45 dk, Cumartesi 60 dk)",
      equipment: "Bilgisayar, Python, Git, GitHub hesabı, Claude / Hugging Face hesapları.",
      sessionTemplateNote: "İş çıkışına uygun olarak Perşembe günleri 45 dk teorik ders ve pratik, Cumartesi günleri 60 dk proje kodlama bloğu.",
      links: [
        {
          title: "roadmap.sh – AI Engineer Yol Haritası",
          url: "https://roadmap.sh/ai-engineer",
          tag: "Omurga"
        },
        {
          title: "Claude Academy (API, MCP, Agent Skills, Claude Code)",
          url: "https://academy.claude.com",
          tag: "Sertifikalı Kurs"
        },
        {
          title: "Hugging Face MCP Course",
          url: "https://huggingface.co/learn/mcp-course/unit0/introduction",
          tag: "MCP"
        },
        {
          title: "Hugging Face Agents Course",
          url: "https://huggingface.co/agents-course",
          tag: "Agents"
        },
        {
          title: "Hugging Face Context Course",
          url: "https://huggingface.co/context-course",
          tag: "Context Eng."
        },
        {
          title: "roadmap.sh – AI Engineer Projeleri",
          url: "https://roadmap.sh/ai-engineer/projects",
          tag: "Projeler"
        }
      ],
      modules: [
        {
          id: "ai-m1",
          period: "Ay 1",
          title: "Temel: LLM, token, API",
          lessons: "roadmap.sh giriş düğümleri → Claude Academy 'Building with the Claude API'",
          passCriteria: "Komut satırından çalışan, streaming ve tool use içeren küçük bir sohbet botu"
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
          title: "Güvenlik ve üretim",
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
      text: "Parkta 5-10-5 mekik süreni ölç ve not et (12. haftada karşılaştıracaksın)"
    },
    {
      id: "chk-2",
      courseId: "tennis",
      text: "Sünger topla 30 ardışık vole"
    },
    {
      id: "chk-3",
      courseId: "violin",
      text: "Hohmann Kitap 1 PDF'ini indir, No. 1–30'u bitir"
    },
    {
      id: "chk-4",
      courseId: "violin",
      text: "Türk müziği ses sistemi videosunu izle, koma işaretlerini öğren"
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
