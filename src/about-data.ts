type Source = { title: string; description: string; links: { label: string; url: string }[] };
type AboutCopy = {
  title: string; eyebrow: string; intro: string; approachTitle: string; approach: string;
  sources: Source[]; note: string;
};

export const aboutDataCopy = {
  ur: {
    title: 'الفاظ اور ان کے ماخذ',
    eyebrow: 'لفظوں کی جستجو',
    intro: 'Qexplore زبان کے مطالعے کا ایک آزاد ذریعہ ہے۔ عربی متن، لفظ بہ لفظ اردو معنی اور الفاظ کی ساخت ایک جگہ پیش کیے گئے ہیں، تاکہ آپ خود زبان کا مطالعہ کر سکیں۔',
    approachTitle: 'اپنی سمجھ سے مطالعہ کریں',
    approach: 'یہاں تفسیر، عقائد پر مبنی تبصرہ، مصنوعی ذہانت سے تیار کردہ آیات کی تشریح یا نظریاتی نتائج شامل نہیں کیے گئے۔ اس ایپ کا کسی مذہبی ادارے سے تعلق نہیں ہے۔',
    sources: [
      {
        title: 'عربی متن اور لفظ بہ لفظ اردو معنی',
        description: 'عربی الفاظ اور ان کے اردو معنی Greentech Apps Foundation کے لفظ بہ لفظ مجموعے سے، QuranicWords کے حوالے کے ذریعے لیے گئے ہیں۔ انہیں ماخذ کے مطابق برقرار رکھا گیا ہے۔ تمام ۶٬۲۳۶ آیات کے {words} الفاظ ایپ کے ساتھ موجود ہیں۔',
        links: [{ label: 'الفاظ کا اصل مجموعہ دیکھیں', url: 'https://github.com/rmrashahriar/QuranicWords/tree/635f923a990c41add1df0d57e8bf96b2d18c6077/reference/word-by-word' }],
      },
      {
        title: 'مادے، لغوی صورتیں اور قواعد',
        description: 'مادے، لغوی صورتیں اور قواعد کی معلومات University of Leeds کے Quranic Arabic Corpus 0.4 سے، mustafa0x کی درست کردہ نقل کے ذریعے لی گئی ہیں۔ بعض حروف، ضمیروں، خاص ناموں اور دوسرے الفاظ کے لیے ماخذ میں مادہ درج نہیں ہے۔',
        links: [{ label: 'عربی الفاظ اور قواعد کا ماخذ دیکھیں', url: 'https://corpus.quran.com/' }],
      },
      {
        title: 'ایک مادے سے متعلق الفاظ کے معنی',
        description: 'یہ حصہ QuranicWords 1.0.0 کی لغوی صورتوں کے اردو معنی دکھاتا ہے۔ جہاں لغوی اندراج دستیاب نہیں، وہاں حوالہ شدہ آیت کے لفظی معنی دکھائے جاتے ہیں۔ استخراج شدہ اور نظرثانی طلب اندراجات نشان زد ہیں۔ یہ متعلقہ الفاظ کے معنی ہیں، مادے کی مکمل لغوی تعریف نہیں۔',
        links: [{ label: 'لغوی معنی کا مجموعہ دیکھیں', url: 'https://github.com/rmrashahriar/QuranicWords/tree/635f923a990c41add1df0d57e8bf96b2d18c6077/dataset' }],
      },
      {
        title: 'مادے کے عمومی لغوی معنی، اردو میں',
        description: 'یہ الگ حصہ Lane کی Arabic-English Lexicon، مقاییس اللغة اور لسان العرب کی لغوی معلومات پر مبنی منتخب عمومی معنی پیش کرتا ہے۔ مختصر اردو خلاصے مصنوعی ذہانت کی مدد سے تیار کیے گئے ہیں۔ یہ کسی شائع شدہ اردو لغت کے اقتباسات نہیں اور کسی ماہر نے ان کی نظرثانی نہیں کی۔ ہر مادے کے ساتھ اصل اقتباسات اور لغت کے حوالہ جات موجود ہیں۔ دو غیر واضح تجزیے نشان زد ہیں۔',
        links: [
          { label: 'Lane کی لغت کا اصل ڈیٹابیس', url: 'https://github.com/laneslexicon/LexiconDatabase/tree/b371ab16b963def3085674a516e5f45d9c787b1d' },
          { label: 'قدیم عربی لغات کے اصل ڈیٹابیس', url: 'https://github.com/wizsk/arabic_lexicons/tree/a34dc0aaa4e45ff245a9bc7213747838c6e51b5a' },
        ],
      },
      {
        title: 'خط اور رازداری',
        description: 'اردو کے لیے جمیل نوری نستعلیق اور عربی کے لیے Scheherazade New استعمال کیے گئے ہیں۔ دونوں خط ایپ کے ساتھ موجود ہیں۔ محفوظ آیات، الفاظ اور ترتیبات اسی براؤزر میں رہتے ہیں۔ استعمال کے دوران کسی اکاؤنٹ، تجزیاتی نگرانی یا مصنوعی ذہانت کی سروس کی ضرورت نہیں ہے۔',
        links: [],
      },
    ],
    note: 'لفظی معنی میں ماخذ کے مترجم کے انتخاب شامل ہوتے ہیں۔ عربی مادوں کے کئی معنی ہو سکتے ہیں؛ صرف مادے سے کسی جملے میں لفظ کا معنی طے نہیں ہوتا۔ کسی ماخذ کا حوالہ دینے کا مطلب اس سے وابستگی نہیں ہے۔',
  },
  en: {
    title: 'The words, and where they come from.',
    eyebrow: 'YOUR EXPLORER',
    intro: 'Qexplore is an independent language tool. It presents Arabic text, Urdu word glosses, and morphology so you can read and examine the language yourself.',
    approachTitle: 'A space for your own understanding',
    approach: 'No tafsir, doctrinal commentary, generated interpretation, religious affiliation, or ideological conclusions are added.',
    sources: [
      {
        title: 'Arabic text & Urdu word glosses',
        description: 'Greentech Apps Foundation word-by-word corpus, preserved as provided, via the QuranicWords reference dataset. All {words} written words across 6,236 ayahs are available locally.',
        links: [{ label: 'View the pinned word corpus', url: 'https://github.com/rmrashahriar/QuranicWords/tree/635f923a990c41add1df0d57e8bf96b2d18c6077/reference/word-by-word' }],
      },
      {
        title: 'Roots, dictionary forms & grammar',
        description: 'Quranic Arabic Corpus v0.4 (University of Leeds), through the corrected mustafa0x morphology fork. Particles, pronouns, proper names, and other words may have no assigned root.',
        links: [{ label: 'Quranic Arabic Corpus', url: 'https://corpus.quran.com/' }],
      },
      {
        title: 'Root family meanings',
        description: 'QuranicWords 1.0.0 Urdu lemma glosses, plus cited occurrence glosses where a lexical entry is unavailable. Extracted entries awaiting review are marked. These are attested meanings of related words, rather than an exhaustive dictionary definition of the root.',
        links: [{ label: 'View the lexical dataset', url: 'https://github.com/rmrashahriar/QuranicWords/tree/635f923a990c41add1df0d57e8bf96b2d18c6077/dataset' }],
      },
      {
        title: 'General root meanings in Urdu',
        description: 'A separate dictionary section gives selected general senses from Lane’s Arabic-English Lexicon, with Maqayis al-Lugha and Lisan al-Arab filling gaps. These are Qexplore’s AI-assisted, concise Urdu renderings of classical dictionary entries, not a published Urdu edition or a specialist-reviewed translation. Original excerpts and entry citations accompany each root. Two unresolved analyses are marked.',
        links: [
          { label: 'Lane’s source database', url: 'https://github.com/laneslexicon/LexiconDatabase/tree/b371ab16b963def3085674a516e5f45d9c787b1d' },
          { label: 'Classical Arabic source databases', url: 'https://github.com/wizsk/arabic_lexicons/tree/a34dc0aaa4e45ff245a9bc7213747838c6e51b5a' },
        ],
      },
      {
        title: 'Typography & privacy',
        description: 'Urdu uses locally bundled Jameel Noori Nastaleeq; Arabic uses Scheherazade New. Saved ayahs, words, and settings stay in this browser. No account, analytics, or runtime AI service is used.',
        links: [],
      },
    ],
    note: 'Word glosses reflect their source’s translation choices. Arabic roots can have multiple senses, and a root’s meaning alone does not establish a word’s meaning in a sentence. Source attribution does not imply affiliation.',
  },
} satisfies Record<'ur' | 'en', AboutCopy>;
