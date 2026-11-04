'use client';

import Link from 'next/link';
import { useSiteLanguage } from '@/lib/i18n/use-language';
import { siteDirection } from '@/lib/i18n/languages';
import styles from './KxPortal.module.css';

type KxPage = 'overview' | 'docs' | 'privacy' | 'support' | 'releases';

const routes: { kind: KxPage; href: string }[] = [
  { kind: 'overview', href: '/software/kx-private-vpn' },
  { kind: 'docs', href: '/docs/kx-private-vpn' },
  { kind: 'privacy', href: '/legal/kx-private-vpn/privacy' },
  { kind: 'support', href: '/support/kx-private-vpn' },
  { kind: 'releases', href: '/software/kx-private-vpn/releases' },
];

const text = {
  en: {
    eyebrow: 'KNOuX SOFTWARE / ANDROID',
    product: 'KX PRIVATE VPN',
    status: 'NATIVE DEVELOPMENT · PRE-RELEASE',
    nav: ['Overview', 'Documentation', 'Privacy', 'Support', 'Releases'],
    headings: {
      overview: ['A private connection.', 'Built on evidence.'],
      docs: ['Know the system.', 'Before you connect.'],
      privacy: ['Privacy by design.', 'Limits in plain sight.'],
      support: ['Get help.', 'Without sharing secrets.'],
      releases: ['Release ledger.', 'Proof before download.'],
    },
    descriptions: {
      overview: 'Android-native WireGuard client with explicit consent, local encrypted profiles, configurable routes and honest connection states. Field verification is ongoing.',
      docs: 'Setup guidance and security boundaries for the developing KX Android application. Actions may vary by build; confirm actual capabilities in your installed version.',
      privacy: 'This policy describes the KX Private VPN Android client under development, not the separate KNOuX website or an independent VPN service provider.',
      support: 'Report problems with reproducible steps and sanitized evidence. Never send a VPN configuration containing private keys.',
      releases: 'Public distribution is gated on release signing, Android device verification and a tested network gateway. We do not publish a placeholder APK.',
    },
    buttons: ['Read the docs', 'Privacy policy', 'View development source', 'Contact support'],
    noRelease: 'There is no public, production-verified signed Android release advertised here.',
    availability: 'DEVELOPMENT STATUS',
    featureHeading: 'Built as real Android services.',
    featureIntro: 'The repository contains working native implementation, with field verification and release acceptance tracked separately.',
    features: [
      ['01', 'WireGuard transport', 'Android VpnService consent and official GoBackend, with connection state and real counters. Owned gateway field proof remains required.'],
      ['02', 'Encrypted profiles', 'Device-local configuration storage using Android Keystore and AES-GCM. Configuration import requires explicit user action.'],
      ['03', 'Split tunneling', 'Per-application inclusion or bypass routing through native VPN APIs; end-to-end egress proof is still pending.'],
      ['04', 'Security visibility', 'Displays measured Android VPN settings, routing evidence and unavailable features without pretending they are enabled.'],
      ['05', 'Advanced networking', 'MTU, DNS and peer keepalive configurations are implemented; real-gateway effects need validation.'],
      ['06', 'Network diagnostics', 'Local connectivity readings and an optional user-approved HTTPS probe. No automatic browsing-history inspection.'],
    ],
    stepsHeading: 'A transparent testing path',
    steps: [
      ['01', 'Bring a trusted profile', 'KX does not create a public commercial VPN account or supply a production server fleet.'],
      ['02', 'Grant Android consent', 'Android must explicitly authorize the VpnService before the client can start a tunnel.'],
      ['03', 'Verify actual traffic', 'A connected UI alone does not establish DNS safety, exit-IP routing or split-tunnel correctness.'],
    ],
    docsSections: [
      ['01 / Prerequisites', 'Use a supported Android device (minSdk 26), a WireGuard configuration from a server you own or trust, and a test build that has been explicitly identified by its source SHA. Never import an unknown configuration.'],
      ['02 / Import and consent', 'Choose Import, select an authorized .conf or manual entry, inspect endpoint and peer details, then approve the Android system VPN permission only when you intend to connect. The app must not bypass this permission.'],
      ['03 / Local profiles', 'Saved profile contents are encrypted in app-private storage using a device-keystore key. Deleting the app removes this local store; keep a secure independent backup of configuration you own.'],
      ['04 / Connection verification', 'Check the backend-confirmed state, latest handshake and transfer counters; then verify server exit address, DNS behaviour, IPv6 and reconnection with a trusted gateway. A status indicator is not proof of those external properties.'],
      ['05 / Split tunneling', 'Select which installed applications should be included in or bypass the tunnel, then explicitly reconnect when required. Verify actual traffic of both selected and bypassed applications.'],
      ['06 / LAN QA gateway', 'The local Windows QA gateway is an isolated WireGuard peer for same-Wi-Fi handshake testing. It does not provide internet egress, a commercial relay or anonymous browsing. Never publish its private key or its peer configuration.'],
      ['07 / Troubleshooting', 'Confirm your phone can reach the endpoint; check VPN consent, endpoint and port, Wi-Fi or mobile-data state, DNS settings, and Android background restrictions. Record the exact build SHA and sanitized logs; never send secrets in screenshots.'],
    ],
    privacySections: [
      ['01 / Who and what this covers', 'KNOuX publishes this notice for the KX Private VPN Android application. It explains current client-side behaviour visible in the source repository. A third-party VPN server you choose is operated under its own privacy practices; KNOuX cannot certify that server as no-logs.'],
      ['02 / Information kept on your device', 'The app saves WireGuard profiles, endpoint information and private keys in AES-GCM encrypted app-private files using a key held by Android Keystore. App preferences, including selected applications for split tunneling and network settings, are stored on the device. Android backup is disabled in the current manifest.'],
      ['03 / Network access and diagnostic requests', 'With Android VPN permission, the app forwards traffic according to the configuration you choose. Android exposes network status, DNS and tunnel counters to the app. Network Doctor makes an HTTPS HEAD request to a specified address only after explicit user approval. That destination sees normal network metadata, such as the originating IP address.'],
      ['04 / Data we do not claim to collect', 'The reviewed native build has no Firebase SDK dependency and does not automatically upload WireGuard private keys, browsing histories or tunnel payloads to a KNOuX cloud service. These statements describe the reviewed build, not a permanent promise about future versions or third-party gateways.'],
      ['05 / Testing and outside services', 'Firebase App Distribution may be used separately to invite a small number of testers. Google processes invitation and distribution information under its own terms. Google/Firebase Crashlytics is not integrated into the reviewed Android build. If optional telemetry is added later, this policy and consent controls must be reviewed before enabling it.'],
      ['06 / Retention and user control', 'Locally saved profiles and preferences remain until you remove them or uninstall the application. Removing them from the app does not remove independent copies you made or logs retained by a server operator you chose. Android and your chosen gateway may keep their own operational records.'],
      ['07 / Security limitations', 'WireGuard encrypts data between your device and the configured VPN peer, not necessarily between that peer and a final destination. A VPN is not a blanket anonymity guarantee or proof of leak protection. Real routing and leak tests are mandatory before any broader security claims.'],
      ['08 / Contact and changes', 'For questions, contact knouxio@zohomail.com. This notice may change as features are implemented; material data-handling changes must be described before release. Last reviewed: 5 November 2026.'],
    ],
    supportSteps: [
      ['Your build', 'Include app version, source commit or release tag, Android version and device model.'],
      ['What happened', 'Give steps to reproduce, expected behaviour and actual behaviour, plus whether the issue occurs on Wi-Fi or mobile data.'],
      ['Safe evidence', 'Remove private keys, peer configurations, access tokens, personal addresses, account details, QR codes and screenshots containing secrets.'],
      ['Security concern', 'Email directly instead of posting sensitive vulnerabilities or data in a public issue.'],
    ],
    releaseSteps: [
      ['Source identity', 'A signed release must identify the exact Git commit, application version and reproducible build metadata.'],
      ['Android quality gates', 'Required lint, tests, API 26/35 device coverage, RTL/LTR and accessibility checks must be reviewed without hiding failures.'],
      ['VPN field proof', 'A trusted gateway must demonstrate real handshake, transfer, DNS/IPv6 route behaviour, reconnect and split-tunnel egress.'],
      ['Distribution integrity', 'Publish hashes, provenance, signed APK/AAB and privacy disclosures before linking a public download.'],
      ['F-Droid readiness', 'An F-Droid submission requires a compatible open-source license and dependency audit. The Android repository currently has no root LICENSE; no F-Droid approval or submission is claimed.'],
    ],
    access: 'No account or payment is required for the client itself; you must bring a trusted VPN profile. An always-free public VPN service is not offered here.',
    sourceNote: 'Read the repository for current implementation and CI evidence. Release status is not inferred from a passing build alone.',
  },
  ar: {
    eyebrow: 'برمجيات KNOUX / أندرويد',
    product: 'KX PRIVATE VPN',
    status: 'تطوير أندرويد أصلي · قبل الإصدار',
    nav: ['نظرة عامة', 'التوثيق', 'الخصوصية', 'الدعم', 'الإصدارات'],
    headings: {
      overview: ['اتصال خاص.', 'مدعوم بالأدلة.'],
      docs: ['افهم النظام.', 'قبل الاتصال.'],
      privacy: ['الخصوصية في التصميم.', 'والحدود بوضوح.'],
      support: ['مساعدة حقيقية.', 'بدون مشاركة أسرارك.'],
      releases: ['سجل الإصدارات.', 'الإثبات قبل التحميل.'],
    },
    descriptions: {
      overview: 'عميل WireGuard أصلي لأندرويد، بموافقة نظام واضحة وملفات تعريف مشفرة محليًا وتوجيه قابل للتخصيص وحالات اتصال حقيقية. اختبارات التشغيل الميدانية مستمرة.',
      docs: 'دليل إعداد وحدود أمان تطبيق KX الجاري تطويره. التفاصيل قد تختلف حسب النسخة، فتحقق من الخدمات الموجودة فعلاً في نسختك.',
      privacy: 'تصف هذه السياسة تطبيق KX Private VPN لأندرويد قيد التطوير، وليس موقع KNOUX المستقل أو مشغّل خادم VPN آخر.',
      support: 'أبلغ عن المشاكل بخطوات قابلة للتكرار وأدلة منقحة. لا ترسل ملف VPN يحتوي مفاتيح خاصة.',
      releases: 'النشر العام مشروط بالتوقيع واختبارات أجهزة أندرويد والتحقق مع خادم شبكة حقيقي. لا نقدم ملف APK شكليًا.',
    },
    buttons: ['اقرأ التوثيق', 'سياسة الخصوصية', 'افتح كود التطوير', 'تواصل مع الدعم'],
    noRelease: 'لا يوجد هنا إصدار أندرويد عام موقّع ومتحقق منه كمنتج إنتاجي.',
    availability: 'حالة التطوير',
    featureHeading: 'خدمات أندرويد حقيقية.',
    featureIntro: 'يحتوي المستودع على تنفيذ Native فعلي، لكن التحقق الميداني والقبول النهائي للإصدار منفصلان عن وجود الكود.',
    features: [
      ['01', 'اتصال WireGuard', 'خدمة Android VpnService ومكتبة GoBackend الرسمية بعد الموافقة؛ اختبار اتصال مع خادم خارجي مملوك لا يزال مطلوبًا.'],
      ['02', 'ملفات تعريف مشفرة', 'حفظ محلي مشفر باستخدام Android Keystore وAES-GCM، واستيراد بإجراء صريح من المستخدم.'],
      ['03', 'تقسيم اتصال التطبيقات', 'إدخال تطبيقات محددة للنفق أو استثناؤها عبر واجهات Android الحقيقية؛ اختبار المرور الفعلي لم يكتمل.'],
      ['04', 'مركز الأمان', 'يعرض إعدادات حماية أندرويد وأدلة التوجيه كما هي، ولا يفعّل خيارات غير منفذة وهميًا.'],
      ['05', 'إعدادات الشبكة المتقدمة', 'إعدادات MTU وDNS وKeepalive موجودة في التنفيذ، لكن تأثيرها عبر خادم فعلي لم يُثبت نهائيًا.'],
      ['06', 'تشخيص الشبكة', 'قراءات حالة الاتصال محليًا واختبار HTTPS اختياري بموافقة صريحة، بدون فحص تلقائي لسجل التصفح.'],
    ],
    stepsHeading: 'مسار اختبار واضح',
    steps: [
      ['01', 'أحضر ملف VPN موثوقًا', 'التطبيق لا يبيع حساب VPN تجاريًا ولا يوفر شبكة خوادم إنتاجية عامة حاليًا.'],
      ['02', 'وافق من نظام أندرويد', 'يلزم أن يمنح المستخدم موافقة VpnService من النظام قبل بدء النفق.'],
      ['03', 'اختبر حركة البيانات فعليًا', 'واجهة «متصل» وحدها لا تثبت أمان DNS أو مسار الخروج أو صحة تقسيم التطبيقات.'],
    ],
    docsSections: [
      ['01 / المتطلبات', 'جهاز Android مدعوم (minSdk 26) وملف WireGuard من خادم تملكه أو تثق به، ونسخة اختبار محددة برقم SHA. لا تستورد إعدادات مجهولة المصدر.'],
      ['02 / الاستيراد والموافقة', 'اختر الاستيراد وحدد ملف .conf أو الإدخال اليدوي، وافحص عنوان الخادم وبيانات Peer، ثم وافق على صلاحية VPN من أندرويد فقط عند رغبتك في الاتصال.'],
      ['03 / التخزين المحلي', 'تُشفّر ملفات الاتصال داخل مساحة التطبيق بمفتاح محفوظ في Android Keystore. عند حذف التطبيق تُزال بياناته المحلية؛ احتفظ بنسخة احتياطية آمنة منفصلة لإعداداتك.'],
      ['04 / إثبات الاتصال', 'راجع حالة GoBackend وآخر Handshake وعدادات النقل، ثم اختبر عنوان الخروج وDNS وIPv6 وإعادة الاتصال باستخدام خادم موثوق. ظهور حالة اتصال ليس إثباتًا لكل ذلك.'],
      ['05 / Split Tunneling', 'اختر التطبيقات الداخلة في النفق أو الخارجة منه، وأعد الاتصال صراحةً عند الحاجة. اختبر حركة البيانات من التطبيقات المشمولة والمستثناة.'],
      ['06 / خادم الاختبار المحلي', 'خادم WireGuard المحلي على Windows مخصص لاختبار Handshake داخل نفس Wi-Fi فقط؛ لا يوفر خروج إنترنت أو إخفاء هوية. لا تنشر مفاتيحه أو ملفات Peer الخاصة.'],
      ['07 / حل المشاكل', 'افحص وصول الهاتف للخادم والمنفذ، وموافقة VPN، وحالة Wi-Fi، وإعدادات DNS وقيود أندرويد في الخلفية. دوّن SHA النسخة وأرسل سجلات منقحة بدون أي أسرار.'],
    ],
    privacySections: [
      ['01 / نطاق السياسة', 'تصف هذه الوثيقة سلوك تطبيق KX Private VPN لأندرويد بحسب كوده الحالي. أي خادم VPN خارجي تختاره له ممارسات خصوصية مستقلة، ولا نستطيع ضمان سياسة عدم احتفاظ بالسجلات للخادم الذي تختاره.'],
      ['02 / البيانات المحفوظة على الجهاز', 'يحفظ التطبيق إعدادات WireGuard وعناوين الخوادم والمفاتيح الخاصة في ملفات مشفرة باستخدام AES-GCM بمفتاح Android Keystore. كما يحفظ تفضيلات التطبيق واختيارات Split Tunneling وإعدادات الشبكة محليًا. النسخ الاحتياطي لأندرويد معطل في Manifest الحالي.'],
      ['03 / الاتصال والتشخيص', 'بعد موافقة VPN من أندرويد، يوجّه التطبيق البيانات حسب الإعداد المختار. يقرأ حالة الشبكة وDNS وعدادات النفق. يجري Network Doctor طلب HTTPS HEAD للعنوان المحدد فقط بعد موافقة المستخدم، ويستطيع الخادم المستهدف رؤية بيانات الاتصال المعتادة مثل عنوان IP المصدر.'],
      ['04 / بيانات لا نزعم جمعها', 'نسخة أندرويد التي تمت مراجعتها لا تحتوي اعتماد Firebase SDK، ولا ترفع تلقائيًا مفاتيح WireGuard الخاصة أو سجل التصفح أو حمولة النفق إلى خادم KNOUX. هذا وصف للكود الذي تمت مراجعته وليس وعدًا مطلقًا لكل إصدار مستقبلي أو خادم خارجي.'],
      ['05 / المختبرون والخدمات الخارجية', 'قد تُستخدم Firebase App Distribution بصورة مستقلة لإرسال دعوات تجريبية لمختبرين محدودين، وتعالج Google بيانات الدعوات والتوزيع وفق شروطها. Crashlytics غير مدمجة في نسخة أندرويد التي تمت مراجعتها. أي إضافة مستقبلية للقياس تتطلب تحديث الإفصاحات وضوابط الموافقة قبل التفعيل.'],
      ['06 / الاحتفاظ والتحكم', 'تظل الملفات والتفضيلات المحلية حتى حذفها أو إزالة التطبيق. إزالة التطبيق لا تحذف نسخًا مستقلة حفظتها أو سجلات لدى مشغّل خادم اخترته. قد يحتفظ نظام أندرويد أو مشغّل الخادم بسجلات تشغيل خاصة بهما.'],
      ['07 / حدود الأمان', 'يشفّر WireGuard المرور بين الهاتف وPeer المحدد، وليس بالضرورة بين الخادم والوجهة النهائية. VPN لا يعني إخفاء هوية شاملًا، ولا يثبت منع التسرب دون اختبارات DNS وIPv6 والتوجيه الفعلي.'],
      ['08 / التواصل والتحديثات', 'للاستفسارات: knouxio@zohomail.com. قد تتغير هذه السياسة مع تنفيذ الخدمات، ويجب توضيح أي تغييرات جوهرية في معالجة البيانات قبل الإصدار. آخر مراجعة: 5 نوفمبر 2026.'],
    ],
    supportSteps: [
      ['معلومات النسخة', 'اذكر إصدار التطبيق أو SHA ورقم Android وطراز الجهاز.'],
      ['وصف المشكلة', 'اكتب خطوات التكرار والنتيجة المتوقعة والفعلية وهل تظهر على Wi-Fi أو بيانات الهاتف.'],
      ['أدلة آمنة', 'احذف المفاتيح الخاصة وملفات Peer وQR والأكواد السرية والعناوين الشخصية من الصور والسجلات.'],
      ['بلاغ أمني', 'راسلنا مباشرة بدل نشر ثغرة حساسة أو بيانات خاصة في Issue عامة.'],
    ],
    releaseSteps: [
      ['هوية المصدر', 'كل إصدار موقّع يحتاج SHA دقيقًا ورقم نسخة وبيانات بناء قابلة للفحص.'],
      ['اختبارات أندرويد', 'مراجعة Lint والاختبارات وأجهزة API 26/35 وRTL/LTR وإمكانية الوصول دون إخفاء أي فشل.'],
      ['إثبات اتصال حقيقي', 'اختبار Handshake والبيانات وDNS/IPv6 وإعادة الاتصال وتقسيم التطبيقات بخادم موثوق.'],
      ['سلامة التوزيع', 'نشر Hash وProvenance وملفات APK/AAB الموقّعة وإفصاحات الخصوصية قبل توفير تحميل عام.'],
      ['متطلبات F-Droid', 'النشر على F-Droid يحتاج ترخيصًا مفتوح المصدر واعتمادات متوافقة. مستودع أندرويد الحالي لا يحتوي ملف LICENSE في الجذر، ولا ندّعي موافقة F-Droid أو تقديم طلب نشر.'],
    ],
    access: 'لا يحتاج العميل نفسه حسابًا أو رسومًا، لكن يجب أن يكون لديك ملف VPN من خادم موثوق. لا نقدم حاليًا خدمة VPN عامة مجانية بلا حدود.',
    sourceNote: 'راجع المستودع لمعرفة التنفيذ الحالي وأدلة CI. نجاح البناء وحده لا يثبت جاهزية الإصدار.',
  },
} as const;

const repo = 'https://github.com/daynightae-cmyk/KX-Private-VPN';
const mail = 'knouxio@zohomail.com';

export function KxPortal({ page }: { page: KxPage }) {
  const language = useSiteLanguage();
  const ar = language === 'ar';
  const t = ar ? text.ar : text.en;
  const current = t.headings[page];

  return (
    <main id="main-content" tabIndex={-1} className={styles.page} dir={siteDirection(language)} lang={language}>
      <div className={styles.mesh} aria-hidden="true" />
      <div className={styles.shell}>
        <div className={styles.topline}>
          <Link href="/products" className={styles.crumb}>KNOuX / SOFTWARE</Link>
          <span className={styles.status}><span aria-hidden="true" className={styles.statusDot} />{t.status}</span>
        </div>
        <nav className={styles.nav} aria-label={ar ? 'تنقل KX' : 'KX product navigation'}>
          {routes.map((item, index) => (
            <Link href={item.href} key={item.kind} className={page === item.kind ? styles.navActive : ''} aria-current={page === item.kind ? 'page' : undefined}>
              <span>{String(index + 1).padStart(2, '0')}</span>{t.nav[index]}
            </Link>
          ))}
        </nav>

        <header className={styles.hero}>
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>{t.eyebrow}</span>
            <div className={styles.wordmark}>{t.product}<span aria-hidden="true">™</span></div>
            <h1>{current[0]}<br /><em>{current[1]}</em></h1>
            <p className={styles.lead}>{t.descriptions[page]}</p>
            <div className={styles.actions}>
              <Link href="/docs/kx-private-vpn" className={styles.primaryAction}>{t.buttons[0]} <span aria-hidden="true">↗</span></Link>
              <a href={repo} target="_blank" rel="noopener noreferrer" className={styles.secondaryAction}>{t.buttons[2]} <span aria-hidden="true">↗</span></a>
            </div>
          </div>
          <div className={styles.visual} role="img" aria-label={ar ? 'تصميم توضيحي لتدفق بيانات WireGuard، وليس حالة اتصال حقيقية' : 'Decorative WireGuard connection diagram, not a live connection status'}>
            <div className={styles.orbitOuter} />
            <div className={styles.orbitInner} />
            <div className={styles.beam} />
            <div className={styles.core}><svg viewBox="0 0 128 128" fill="none" aria-hidden="true" focusable="false"><path d="M64 8 110 28v30c0 31-18 51-46 62C36 109 18 89 18 58V28L64 8Z" stroke="currentColor" strokeWidth="3.5"/><path d="m40 64 16 16 33-37" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
            <div className={styles.topVisualLabel}>WIREGUARD / ANDROID</div>
            <div className={styles.bottomVisualLabel}>QA / NO LIVE STATUS</div>
          </div>
        </header>

        {page === 'overview' ? (
          <>
            <div className={styles.facts}>
              <span>ANDROID / API 26+</span><span>WIREGUARD / GoBackend</span><span>LOCAL ENCRYPTED PROFILES</span><span>NO PUBLIC RELEASE</span>
            </div>
            <section className={styles.section}>
              <div className={styles.sectionHeading}><span className={styles.eyebrow}>01 / CAPABILITIES</span><h2>{t.featureHeading}</h2><p>{t.featureIntro}</p></div>
              <div className={styles.cardGrid}>
                {t.features.map(([n, title, detail]) => <article key={n} className={styles.featureCard}><span className={styles.cardNumber}>{n}</span><h3>{title}</h3><p>{detail}</p><span className={styles.cardFoot}>IMPLEMENTED / FIELD QA PENDING</span></article>)}
              </div>
            </section>
            <section className={styles.section}>
              <div className={styles.sectionHeading}><span className={styles.eyebrow}>02 / QA</span><h2>{t.stepsHeading}</h2></div>
              <div className={styles.stepGrid}>{t.steps.map(([n, title, detail]) => <article className={styles.step} key={n}><span>{n}</span><h3>{title}</h3><p>{detail}</p></article>)}</div>
            </section>
            <div className={styles.notice}><strong>{t.availability}</strong><p>{t.access}</p><p>{t.noRelease}</p><Link href="/software/kx-private-vpn/releases">{t.nav[4]} ↗</Link></div>
          </>
        ) : null}

        {page === 'docs' ? (
          <section className={styles.section}>
            <div className={styles.sectionHeading}><span className={styles.eyebrow}>GUIDE / SOURCE-AWARE</span><h2>{ar ? 'دليل الإعداد والأمان' : 'Setup and security guide'}</h2><p>{t.sourceNote}</p></div>
            <div className={styles.articleList}>{t.docsSections.map(([title, body]) => <article key={title} className={styles.article}><h2>{title}</h2><p>{body}</p></article>)}</div>
          </section>
        ) : null}

        {page === 'privacy' ? (
          <section className={styles.section}>
            <div className={styles.sectionHeading}><span className={styles.eyebrow}>PRIVACY NOTICE / REVIEWED 2026-11-05</span><h2>{ar ? 'ما نحفظه، وما لا نعرفه.' : 'What stays local. What does not.'}</h2></div>
            <div className={styles.articleList}>{t.privacySections.map(([title, body]) => <article key={title} className={styles.article}><h2>{title}</h2><p>{body}</p></article>)}</div>
            <p className={styles.smallPrint}>{ar ? 'هذه السياسة تخص تطبيق Android المذكور، وقد تختلف سياسة خصوصية الموقع نفسه.' : 'This notice concerns the named Android client. The website has separate data processing and site analytics.'}</p>
          </section>
        ) : null}

        {page === 'support' ? (
          <section className={styles.section}>
            <div className={styles.sectionHeading}><span className={styles.eyebrow}>SUPPORT / REPRODUCIBLE REPORTS</span><h2>{ar ? 'نساعدك بالأدلة.' : 'Evidence makes support useful.'}</h2></div>
            <div className={styles.stepGrid}>{t.supportSteps.map(([title, body], i) => <article className={styles.step} key={title}><span>{String(i + 1).padStart(2, '0')}</span><h3>{title}</h3><p>{body}</p></article>)}</div>
            <div className={styles.supportActions}><a href={'mailto:' + mail + '?subject=KX%20Private%20VPN%20Support'} className={styles.primaryAction}>{mail} ↗</a><a href={repo + '/issues'} target="_blank" rel="noopener noreferrer" className={styles.secondaryAction}>{ar ? 'مشاكل GitHub العامة' : 'Public issue tracker'} ↗</a></div>
          </section>
        ) : null}

        {page === 'releases' ? (
          <section className={styles.section}>
            <div className={styles.releaseWarning}><span className={styles.eyebrow}>RELEASE GATE / BLOCKED</span><h2>{t.noRelease}</h2><p>{t.sourceNote}</p><a href={repo + '/releases'} target="_blank" rel="noopener noreferrer" className={styles.secondaryAction}>{ar ? 'تحقق من إصدارات GitHub' : 'Check GitHub release records'} ↗</a></div>
            <div className={styles.articleList}>{t.releaseSteps.map(([title, body], i) => <article key={title} className={styles.article}><h2>{String(i + 1).padStart(2, '0')} / {title}</h2><p>{body}</p></article>)}</div>
          </section>
        ) : null}

        <aside className={styles.bottomCta}><span>KX / KNOuX</span><p>{t.sourceNote}</p><div><Link href="/legal/kx-private-vpn/privacy">{t.buttons[1]} ↗</Link><Link href="/support/kx-private-vpn">{t.buttons[3]} ↗</Link><Link href="/products">{ar ? 'كل المنتجات' : 'All products'} ↗</Link></div></aside>
      </div>
    </main>
  );
}
