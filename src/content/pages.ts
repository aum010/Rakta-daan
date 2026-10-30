import type { Locale } from "@/lib/i18n";

export type Section = {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
};

export type DocPage = {
  title: string;
  intro: string;
  updated?: string;
  sections: Section[];
};

export type DocKey = "about" | "safety" | "privacy" | "terms" | "organisations";

export const DOC_PAGES: Record<DocKey, Record<Locale, DocPage>> = {
  about: {
    en: {
      title: "About Rakta-Daan",
      intro:
        "Rakta-Daan is an independent, Nepal-first website for finding blood-related help and coordinating with willing donors. It exists because families in a crisis often spend hours calling numbers that lead nowhere.",
      sections: [
        {
          heading: "What we do",
          paragraphs: [
            "We show blood-bank stock where a facility has published it, tell you how many consented donors are near a district, and let you send a request that notifies compatible donors who opted in.",
            "We are a coordination layer. We do not collect, test, store, transport or sell blood, and we are not a substitute for a licensed blood transfusion service.",
          ],
        },
        {
          heading: "Why a website, not an app",
          paragraphs: [
            "A distressed family member should not have to install anything. Every feature works in a mobile browser, including the link a donor receives by SMS or WhatsApp.",
            "The site is built for low bandwidth: server-rendered pages, no analytics scripts, no third-party trackers, and small pages that work on a slow connection.",
          ],
        },
        {
          heading: "How we describe uncertainty",
          paragraphs: [
            "Facility stock is self-reported and always shown with the time it was updated. Donor availability is self-reported and expires after 30 days. Verification labels describe our own review, not a government licence.",
            "If a message was only queued, we say queued. If it was simulated because no provider is configured, we say simulated. We never label something delivered without a provider confirmation.",
          ],
        },
        {
          heading: "What is still missing",
          bullets: [
            "No live integration with the national blood-transfusion system or hospital information systems.",
            "No automated identity or licence verification: administrators review details manually.",
            "No mobile app, by design. Push notifications are therefore unavailable; messaging is the notification channel.",
            "Municipality-level reference data is typed by users rather than chosen from an official list.",
          ],
        },
      ],
    },
    ne: {
      title: "रक्त-दानबारे",
      intro:
        "रक्त-दान नेपाल-केन्द्रित स्वतन्त्र वेबसाइट हो, जसले रगतसँग सम्बन्धित सहयोग खोज्न र इच्छुक दातासँग समन्वय गर्न सघाउँछ। संकटमा परेका परिवारले घण्टौं फोन गर्दा पनि उत्तर नपाउने समस्या हटाउन यो बनाइएको हो।",
      sections: [
        {
          heading: "हामी के गर्छौं",
          paragraphs: [
            "संस्थाले जनाएको मौजुदात देखाउँछौं, जिल्ला वरपर कति सहमत दाता छन् बताउँछौं, र सहमति दिएका मिल्ने दातालाई सूचना पठाउने अनुरोध बनाउन दिन्छौं।",
            "हामी समन्वय मात्र गर्छौं। रगत संकलन, परीक्षण, भण्डारण, ढुवानी वा बिक्री गर्दैनौं र इजाजतप्राप्त रक्तसञ्चार सेवाको विकल्प होइनौं।",
          ],
        },
        {
          heading: "एप किन होइन, वेबसाइट किन",
          paragraphs: [
            "संकटमा रहेको परिवारले केही इन्स्टल गर्नु नपर्ने। दाताले SMS वा WhatsApp मा पाएको लिंक पनि मोबाइल ब्राउजरमै चल्छ।",
            "कम ब्यान्डविथका लागि बनाइएको: सर्भरमा रेन्डर हुने पृष्ठ, कुनै एनालिटिक्स स्क्रिप्ट वा तेस्रो-पक्ष ट्र्याकर छैन।",
          ],
        },
        {
          heading: "अनिश्चितता कसरी देखाउँछौं",
          paragraphs: [
            "संस्थाको मौजुदात आफैंले जनाएको हुन्छ र अद्यावधिक समयसँगै देखाइन्छ। दाताको उपलब्धता ३० दिनमा पुरानो हुन्छ। प्रमाणित लेबल हाम्रो समीक्षा जनाउँछ, सरकारी इजाजत होइन।",
            "सन्देश पंक्तिमा मात्र राखिएको छ भने त्यही भन्छौं; प्रदायक सेट नभएकाले सिमुलेट भएको छ भने त्यही भन्छौं। प्रदायकको पुष्टि बिना पुर्‍याइयो भन्दैनौं।",
          ],
        },
        {
          heading: "अझै नभएका कुरा",
          bullets: [
            "राष्ट्रिय रक्तसञ्चार प्रणाली वा अस्पतालको सूचना प्रणालीसँग प्रत्यक्ष जडान छैन।",
            "स्वचालित परिचय वा इजाजत जाँच छैन: प्रशासकले विवरण हस्तक्षेपबाट समीक्षा गर्छन्।",
            "मोबाइल एप जानाजान बनाइएको छैन; सूचना SMS/WhatsApp बाट जान्छ।",
            "नगरपालिकाको सूची आधिकारिक स्रोतबाट छान्ने होइन, प्रयोगकर्ताले लेख्छन्।",
          ],
        },
      ],
    },
  },
  safety: {
    en: {
      title: "Safety and responsible use",
      intro:
        "Rakta-Daan helps you reach people faster. It cannot make blood appear, and it cannot decide whether someone is fit to donate. These rules protect everyone involved.",
      sections: [
        {
          heading: "In an emergency",
          paragraphs: [
            "Call your local ambulance service or go to the nearest hospital emergency department. Do not wait for a website response if the patient is deteriorating.",
            "Use Rakta-Daan alongside the hospital, not instead of it. Hospital blood banks and licensed transfusion services remain responsible for cross-matching and transfusion.",
          ],
        },
        {
          heading: "Donor eligibility is decided by the blood bank",
          paragraphs: [
            "Rakta-Daan records self-reported information only. Age limits (18–65), the 90-day interval and any weight field are screening prompts, not medical clearance.",
            "A blood bank will check haemoglobin, blood pressure, medication, travel and infection risk before accepting a donation. Never pressure someone to donate against that advice.",
          ],
        },
        {
          heading: "Blood is never bought or sold here",
          bullets: [
            "Rakta-Daan is free. We do not charge requesters or donors, and we do not process payments.",
            "Nobody should ask you for money to “arrange” blood. Treat such a request as a red flag and report it.",
            "Do not offer or accept payment, gifts or favours in exchange for a donation.",
            "We do not broker blood, guarantee availability, or act as an agent for any facility.",
          ],
        },
        {
          heading: "Protect yourself when meeting",
          bullets: [
            "Meet at the hospital or blood bank, not a private location.",
            "Share only what is needed. Never share a one-time code, bank details or identity documents with another user.",
            "Tell a family member where you are going and who you are meeting.",
            "If a request feels wrong, stop and report it. You do not owe anyone a donation.",
          ],
        },
        {
          heading: "Privacy of patients",
          paragraphs: [
            "Requesters should not post a patient's name, diagnosis or hospital ID. Our request form asks for a facility, blood group and timing — that is enough for a donor to decide whether to help.",
            "Public request pages do not show the requester's phone number unless they explicitly choose to publish it.",
          ],
        },
        {
          heading: "Report a problem",
          paragraphs: [
            "Use the report link on any request page, or the report form. Reports are reviewed by an administrator. In a life-threatening situation, contact the hospital or emergency services instead of waiting for a review.",
          ],
        },
      ],
    },
    ne: {
      title: "सुरक्षा र जिम्मेवार प्रयोग",
      intro:
        "रक्त-दानले मानिससँग छिटो पुग्न सघाउँछ। यसले रगत उपलब्ध गराउन सक्दैन र कोही दान गर्न योग्य छ कि छैन भन्ने निर्णय गर्दैन। यी नियमले सबैको सुरक्षा गर्छन्।",
      sections: [
        {
          heading: "आपतकालीन अवस्थामा",
          paragraphs: [
            "स्थानीय एम्बुलेन्स बोलाउनुहोस् वा नजिकको अस्पतालको आकस्मिक कक्षमा जानुहोस्। बिरामीको अवस्था बिग्रिँदै छ भने वेबसाइटको प्रतिक्रिया कुर्नु हुँदैन।",
            "अस्पतालको विकल्प होइन, सहयोगका रूपमा प्रयोग गर्नुहोस्। क्रस-म्याचिङ र रक्तसञ्चारको जिम्मेवारी इजाजतप्राप्त रक्त बैंकको हो।",
          ],
        },
        {
          heading: "दान योग्यता रक्त बैंकले निर्णय गर्छ",
          paragraphs: [
            "रक्त-दानमा आफैंले जनाएको जानकारी मात्र हुन्छ। उमेर (१८–६५), ९० दिनको अन्तराल र तौल स्क्रिनिङ संकेत मात्र हुन्, चिकित्सकीय स्वीकृति होइन।",
            "रक्त बैंकले हिमोग्लोबिन, रक्तचाप, औषधि, यात्रा र संक्रमण जोखिम जाँच्छ। त्यसविपरीत कसैलाई दबाब नदिनुहोस्।",
          ],
        },
        {
          heading: "यहाँ रगत किनबेच हुँदैन",
          bullets: [
            "रक्त-दान निःशुल्क हो। अनुरोधकर्ता वा दाताबाट शुल्क लिइँदैन, भुक्तानी प्रशोधन गरिँदैन।",
            "रगत “मिलाउन” पैसा माग्ने कसैलाई विश्वास नगर्नुहोस्; रिपोर्ट गर्नुहोस्।",
            "रक्तदानको बदलामा पैसा, उपहार वा फाइदा नदिनुहोस् र नलिनुहोस्।",
            "हामी रगत दलाली गर्दैनौं, उपलब्धताको ग्यारेन्टी दिँदैनौं।",
          ],
        },
        {
          heading: "भेट्दा सावधानी",
          bullets: [
            "निजी ठाउँ होइन, अस्पताल वा रक्त बैंकमा भेट्नुहोस्।",
            "आवश्यक कुरा मात्र बाँड्नुहोस्। एक-पटकको कोड, बैंक विवरण वा परिचयपत्र कसैलाई नदिनुहोस्।",
            "कहाँ जाँदै हुनुहुन्छ र कसलाई भेट्दै हुनुहुन्छ परिवारलाई भन्नुहोस्।",
            "अनुरोध ठीक लागेन भने रोक्नुहोस् र रिपोर्ट गर्नुहोस्। कसैलाई दान गर्नैपर्ने बाध्यता छैन।",
          ],
        },
        {
          heading: "बिरामीको गोपनीयता",
          paragraphs: [
            "बिरामीको नाम, रोग वा अस्पताल परिचय नम्बर नलेख्नुहोस्। संस्था, रक्त समूह र समय पर्याप्त हुन्छ।",
            "अनुरोधकर्ताले स्पष्ट रूपमा नखोलेसम्म सार्वजनिक पृष्ठमा फोन नम्बर देखिँदैन।",
          ],
        },
        {
          heading: "समस्या रिपोर्ट",
          paragraphs: [
            "कुनै पनि अनुरोध पृष्ठको रिपोर्ट लिंक वा फारम प्रयोग गर्नुहोस्। प्रशासकले समीक्षा गर्छन्। ज्यानको जोखिम छ भने अस्पताल वा आपतकालीन सेवामा सम्पर्क गर्नुहोस्।",
          ],
        },
      ],
    },
  },
  privacy: {
    en: {
      title: "Privacy notice",
      intro:
        "Blood requests reveal that someone is unwell, and donor profiles reveal personal contact details. We collect as little as possible, encrypt what is sensitive, and publish nothing that identifies a donor.",
      updated: "Version 2026-10",
      sections: [
        {
          heading: "What we collect",
          bullets: [
            "Account: phone number, name, language preference.",
            "Donor profile: blood group, sex, date of birth (for age checks), optional weight, district, optional municipality and ward, last donation date, availability and consent choices.",
            "Requests: blood group, component, units, urgency, facility, district, required time, contact name and phone, optional encrypted patient reference, optional note.",
            "Delivery records: channel, template, status, provider ids and error codes. Message bodies are stored without the recipient's phone number.",
            "Security logs: hashed IP address and user agent for audit events and rate limiting.",
          ],
        },
        {
          heading: "What we never do",
          bullets: [
            "We do not publish donor names or phone numbers, and we do not sell or rent personal data.",
            "We do not show an exact donor count below three, to reduce re-identification.",
            "We do not store plain phone numbers in the database: they are encrypted, with a keyed hash used only for exact-match lookup.",
            "We do not use advertising cookies, third-party analytics or social media pixels.",
          ],
        },
        {
          heading: "Who sees what",
          bullets: [
            "A donor who was alerted sees the facility, district, blood group, timing and urgency — never the requester's phone number.",
            "A requester sees a donor's name and phone number only after that donor says they can help, and only if the donor enabled contact sharing.",
            "Organisation staff see their own organisation's stock and staff list only.",
            "Administrators see masked phone numbers for support and abuse review, and every administrative action is written to an audit log.",
          ],
        },
        {
          heading: "Consent",
          paragraphs: [
            "Joining as a donor requires separate choices: emergency alerts, SMS, WhatsApp, and contact sharing when you say you can help. Each choice is recorded with a version and timestamp; every change is appended to a consent history that cannot be silently edited.",
            "You can pause alerts or leave the donor list in one tap from your donor dashboard. Leaving stops matching immediately and removes you from future alerts. Consent history is retained for accountability.",
          ],
        },
        {
          heading: "Legal basis and your rights",
          paragraphs: [
            "We rely on your consent and on the purpose limitation principle in Nepal's Privacy Act, 2075: data collected for donor coordination is used for donor coordination. Sensitive information such as health-adjacent details is kept to the minimum needed to route a request.",
            "You may ask what we hold about you, ask us to correct it, withdraw consent, or request deletion of your account. Deletion of an account also ends any active donor profile. Where a request must be retained for a safety or abuse investigation, we keep only what is necessary and restrict access.",
          ],
        },
        {
          heading: "Retention",
          bullets: [
            "Open requests expire automatically (24 hours for critical, 72 hours for urgent, 7 days for planned).",
            "Contact phone numbers on requests become inaccessible once the request closes; the encrypted value is removed during routine cleanup.",
            "Delivery records are kept up to 12 months for troubleshooting and abuse review.",
            "Audit records are kept up to 24 months.",
          ],
        },
        {
          heading: "Security, processors and cross-border transfer",
          paragraphs: [
            "Phone numbers and request contact details are encrypted with AES-256-GCM. Session tokens are stored only as hashes. Login codes are single-use, expiring and rate-limited. Administrative actions require an administrator account and are audited.",
            "Messaging may involve Meta (WhatsApp) or a Nepal SMS gateway, and hosting may be outside Nepal. Those providers process the minimum needed to deliver a message: a phone number and the message content. We do not send patient names or diagnoses.",
            "If a breach affects your data, we will notify affected users and the relevant authority without undue delay. Nepal's Privacy Act does not specify a single general breach-notification deadline that we could verify; our internal target is 72 hours after confirmation. This notice is not legal advice and is pending review by Nepali counsel.",
          ],
        },
        {
          heading: "Contact",
          paragraphs: [
            "Privacy questions and data requests can be sent to the operator's published support address. If this deployment has not published one yet, use the report form and include a way to reach you; we will respond there.",
          ],
        },
      ],
    },
    ne: {
      title: "गोपनीयता सूचना",
      intro:
        "रक्त अनुरोधले कसैको स्वास्थ्य अवस्था र दाता प्रोफाइलले व्यक्तिगत सम्पर्क खुलाउँछ। हामी न्यूनतम जानकारी लिन्छौं, संवेदनशील डाटा इन्क्रिप्ट गर्छौं र दाताको पहिचान सार्वजनिक गर्दैनौं।",
      updated: "संस्करण २०२६-१०",
      sections: [
        {
          heading: "हामी के संकलन गर्छौं",
          bullets: [
            "खाता: फोन नम्बर, नाम, भाषा।",
            "दाता प्रोफाइल: रक्त समूह, लिङ्ग, जन्म मिति (उमेर जाँच), वैकल्पिक तौल, जिल्ला, वैकल्पिक नगरपालिका/वडा, पछिल्लो रक्तदान मिति, उपलब्धता र सहमति।",
            "अनुरोध: रक्त समूह, कम्पोनेन्ट, युनिट, जरुरीपन, संस्था, जिल्ला, आवश्यक समय, सम्पर्क नाम र फोन, वैकल्पिक इन्क्रिप्टेड सन्दर्भ, वैकल्पिक टिप्पणी।",
            "पठाइ अभिलेख: माध्यम, टेम्प्लेट, स्थिति, प्रदायक आईडी र त्रुटि कोड। सन्देशमा प्राप्तकर्ताको फोन नम्बर राखिँदैन।",
            "सुरक्षा लग: अडिट र दर-सीमाका लागि ह्यास गरिएको आईपी र युजर एजेन्ट।",
          ],
        },
        {
          heading: "हामी कहिल्यै नगर्ने",
          bullets: [
            "दाताको नाम वा फोन नम्बर सार्वजनिक गर्दैनौं, व्यक्तिगत डाटा बेच्दैनौं।",
            "पहिचान जोगाउन तीनभन्दा कम दाताको ठ्याक्कै संख्या देखाउँदैनौं।",
            "डाटाबेसमा सादा फोन नम्बर राखिँदैन: इन्क्रिप्टेड, र खोजका लागि मात्र कि-ह्यास।",
            "विज्ञापन कुकी, तेस्रो-पक्ष एनालिटिक्स वा पिक्सेल प्रयोग गर्दैनौं।",
          ],
        },
        {
          heading: "कसले के देख्छ",
          bullets: [
            "सूचना पाएको दाताले संस्था, जिल्ला, रक्त समूह, समय र जरुरीपन मात्र देख्छ — अनुरोधकर्ताको फोन कहिल्यै होइन।",
            "दाताले सहयोग गर्न सक्ने बताएपछि र सम्पर्क साझा गर्ने सहमति दिएपछि मात्र अनुरोधकर्ताले नाम र फोन देख्छ।",
            "संस्थाका कर्मचारीले आफ्नै संस्थाको मौजुदात र टोली मात्र देख्छन्।",
            "प्रशासकले मास्क गरिएको फोन देख्छन् र हरेक प्रशासकीय कार्य अडिट लगमा लेखिन्छ।",
          ],
        },
        {
          heading: "सहमति",
          paragraphs: [
            "दाता बन्न अलग-अलग सहमति आवश्यक छ: आपतकालीन सूचना, SMS, WhatsApp र सहयोग गर्ने बेला सम्पर्क साझा। प्रत्येक सहमति संस्करण र समयसहित राखिन्छ; परिवर्तनको इतिहास मेटिँदैन।",
            "दाता ड्यासबोर्डबाट एक क्लिकमा सूचना रोक्न वा सूचीबाट हट्न सकिन्छ। हट्दा मिलान तुरुन्त रोकिन्छ; जवाफदेहिताका लागि सहमतिको इतिहास रहन्छ।",
          ],
        },
        {
          heading: "कानुनी आधार र तपाईंका अधिकार",
          paragraphs: [
            "हामी तपाईंको सहमति र नेपालको गोपनीयता ऐन, २०७५ को प्रयोजन-सीमा सिद्धान्तमा आधारित छौं: दाता समन्वयका लागि लिइएको डाटा त्यही प्रयोजनमा मात्र प्रयोग हुन्छ। स्वास्थ्यसँग जोडिएको संवेदनशील जानकारी न्यूनतम राखिन्छ।",
            "तपाईंसँग रहेको जानकारी सोध्न, सच्याउन, सहमति फिर्ता लिन वा खाता मेट्न अनुरोध गर्न सक्नुहुन्छ। सुरक्षा वा दुरुपयोग अनुसन्धानका लागि आवश्यक परेको सीमित अभिलेख मात्र सीमित पहुँचमा राखिन्छ।",
          ],
        },
        {
          heading: "अभिलेख राख्ने अवधि",
          bullets: [
            "खुला अनुरोध स्वतः म्याद सकिन्छ (अति गम्भीर २४ घण्टा, अत्यावश्यक ७२ घण्टा, योजनाबद्ध ७ दिन)।",
            "अनुरोध बन्द भएपछि सम्पर्क फोन पहुँचबाट हटाइन्छ; नियमित सफाइमा इन्क्रिप्टेड मान हटाइन्छ।",
            "पठाइ अभिलेख १२ महिनासम्म, अडिट अभिलेख २४ महिनासम्म।",
          ],
        },
        {
          heading: "सुरक्षा, प्रशोधक र सीमापार स्थानान्तरण",
          paragraphs: [
            "फोन नम्बर र सम्पर्क विवरण AES-256-GCM ले इन्क्रिप्ट गरिन्छ। सेसन टोकन ह्यासका रूपमा मात्र राखिन्छ। लगइन कोड एक-पटक, म्यादसहित र दर-सीमित हुन्छ।",
            "सन्देश पठाउन Meta (WhatsApp) वा नेपाली SMS गेटवे प्रयोग हुन सक्छ, र होस्टिङ नेपाल बाहिर हुन सक्छ। ती प्रदायकले सन्देश पुर्‍याउन आवश्यक न्यूनतम जानकारी मात्र पाउँछन्; बिरामीको नाम वा रोगको विवरण जाँदैन।",
            "डाटा चुहावट भएमा प्रभावित प्रयोगकर्ता र सम्बन्धित निकायलाई अनावश्यक ढिलाइ बिना सूचित गर्छौं। यो सूचना कानुनी सल्लाह होइन र नेपाली कानूनी परामर्शद्वारा समीक्षा गर्न बाँकी छ।",
          ],
        },
        {
          heading: "सम्पर्क",
          paragraphs: [
            "गोपनीयता प्रश्न र डाटा अनुरोधका लागि सञ्चालकको प्रकाशित सहयोग ठेगानामा लेख्नुहोस्। यो संस्करणमा ठेगाना प्रकाशित नभएको भए रिपोर्ट फारमबाट सम्पर्क गर्नुहोस्।",
          ],
        },
      ],
    },
  },
  terms: {
    en: {
      title: "Terms of use",
      intro:
        "These terms cover your use of Rakta-Daan. By creating an account or using the site you accept them. If you do not accept them, do not use the service.",
      updated: "Version 2026-10",
      sections: [
        {
          heading: "The service",
          paragraphs: [
            "Rakta-Daan provides information about organisations that publish blood stock, aggregate donor availability, and a messaging relay for consented donors. It is a coordination tool, not a healthcare provider, blood bank, or emergency service.",
            "We do not guarantee that blood will be found, that a donor will respond, or that any listed information is current. Always confirm with the facility.",
          ],
        },
        {
          heading: "Accounts",
          bullets: [
            "You must be at least 18 to register as a donor. Accounts are personal and phone-verified.",
            "Give accurate information. A false request wastes donors' time and may be removed.",
            "Keep your phone and one-time codes private. You are responsible for activity on your account.",
            "We may suspend accounts that abuse the service, and will record why.",
          ],
        },
        {
          heading: "Acceptable use",
          bullets: [
            "No fake, duplicate or speculative requests, and no requests on behalf of someone who has not asked you to.",
            "No harassment, discrimination, spam, scraping, bulk messaging or automated access.",
            "No buying, selling, brokering or advertising blood or blood products.",
            "No posting another person's health information without their consent.",
            "No attempts to access other users' data, bypass rate limits or probe the service.",
          ],
        },
        {
          heading: "Content and privacy",
          paragraphs: [
            "You keep ownership of the content you submit and grant us a limited licence to display and transmit it to provide the service. Our privacy notice explains what is collected and who can see it.",
            "Request pages are shareable by design. Do not include information in a request that you would not want shared with the people who receive the link.",
          ],
        },
        {
          heading: "Liability",
          paragraphs: [
            "To the extent permitted by Nepali law, Rakta-Daan is provided “as is” without warranties. We are not liable for the acts or omissions of donors, requesters, organisations or messaging providers, or for medical outcomes.",
            "Nothing in these terms limits liability that cannot lawfully be limited, including liability for fraud or wilful misconduct.",
          ],
        },
        {
          heading: "Changes, suspension and law",
          paragraphs: [
            "We may change features or these terms; material changes will be announced on this page with a new version number. You may stop using the service and leave the donor list at any time.",
            "These terms are governed by the laws of Nepal, and disputes are subject to the courts of Nepal. If a provision is unenforceable, the rest remains in effect.",
          ],
        },
      ],
    },
    ne: {
      title: "प्रयोगका सर्तहरू",
      intro:
        "यी सर्तले रक्त-दानको प्रयोग समेट्छन्। खाता बनाउँदा वा साइट प्रयोग गर्दा तपाईं सहमत हुनुहुन्छ। सहमत नभएमा सेवा प्रयोग नगर्नुहोस्।",
      updated: "संस्करण २०२६-१०",
      sections: [
        {
          heading: "सेवा",
          paragraphs: [
            "रक्त-दानले रक्त मौजुदात जनाउने संस्थाको जानकारी, दाता उपलब्धताको समग्र जानकारी र सहमत दातालाई सन्देश पठाउने माध्यम दिन्छ। यो समन्वय उपकरण हो, स्वास्थ्य सेवा, रक्त बैंक वा आपतकालीन सेवा होइन।",
            "रगत भेटिन्छ, दाताले प्रतिक्रिया दिन्छन् वा जानकारी हालको छ भन्ने ग्यारेन्टी छैन। संस्थासँग पुष्टि गर्नुहोस्।",
          ],
        },
        {
          heading: "खाता",
          bullets: [
            "दाता दर्ताका लागि कम्तीमा १८ वर्ष पुगेको हुनुपर्छ। खाता व्यक्तिगत हो र फोनबाट प्रमाणित हुन्छ।",
            "सही जानकारी दिनुहोस्। झुटो अनुरोधले दाताको समय बर्बाद गर्छ र हटाइन सक्छ।",
            "फोन र एक-पटक कोड गोप्य राख्नुहोस्। खाताको गतिविधिको जिम्मेवारी तपाईंको हो।",
            "सेवाको दुरुपयोग गर्ने खाता निलम्बन गर्न सक्छौं र कारण अभिलेख गर्छौं।",
          ],
        },
        {
          heading: "स्वीकार्य प्रयोग",
          bullets: [
            "झुटो, दोहोरो वा कसैको अनुमति बिनाको अनुरोध नगर्नुहोस्।",
            "उत्पीडन, भेदभाव, स्पाम, स्क्र्यापिङ, ठूलो मात्रामा सन्देश वा स्वचालित पहुँच नगर्नुहोस्।",
            "रगत वा रक्त उत्पादनको किनबेच, दलाली वा विज्ञापन नगर्नुहोस्।",
            "अरूको स्वास्थ्य जानकारी सहमति बिना नलेख्नुहोस्।",
            "अरूको डाटा पहुँच, दर-सीमा छल्ने वा सेवा जाँच्ने प्रयास नगर्नुहोस्।",
          ],
        },
        {
          heading: "सामग्री र गोपनीयता",
          paragraphs: [
            "तपाईंले पठाएको सामग्रीको स्वामित्व तपाईंसँग रहन्छ; सेवा दिन देखाउन र पठाउन सीमित अनुमति दिनुहुन्छ। के संकलन हुन्छ र कसले देख्छ भन्ने गोपनीयता सूचनामा छ।",
            "अनुरोध पृष्ठ लिंकबाट बाँडिन्छ। लिंक पाउनेले देख्न नहुने जानकारी नलेख्नुहोस्।",
          ],
        },
        {
          heading: "दायित्व",
          paragraphs: [
            "नेपाली कानूनले अनुमति दिएसम्म सेवा “जस्तो छ त्यस्तै” उपलब्ध छ, कुनै ग्यारेन्टी छैन। दाता, अनुरोधकर्ता, संस्था वा सन्देश प्रदायकका कार्य वा चिकित्सकीय परिणामका लागि हामी जिम्मेवार छैनौं।",
            "कानूनले सीमित गर्न नमिल्ने दायित्व (ठगी वा जानाजानी कदाचार) यी सर्तले सीमित गर्दैनन्।",
          ],
        },
        {
          heading: "परिवर्तन, निलम्बन र कानून",
          paragraphs: [
            "सुविधा वा सर्त परिवर्तन गर्न सक्छौं; महत्वपूर्ण परिवर्तन नयाँ संस्करणसहित यही पृष्ठमा जानकारी गराइनेछ। तपाईं जुनसुकै बेला प्रयोग रोक्न र दाता सूचीबाट हट्न सक्नुहुन्छ।",
            "यी सर्त नेपालको कानूनद्वारा नियन्त्रित छन् र विवाद नेपालका अदालतको क्षेत्राधिकारमा रहनेछ।",
          ],
        },
      ],
    },
  },
  organisations: {
    en: {
      title: "For hospitals and blood banks",
      intro:
        "Publish the stock you already report internally, so families can see it before they travel. Access is limited to staff whose account an administrator has linked to your organisation.",
      sections: [
        {
          heading: "What you get",
          bullets: [
            "A public organisation page with your contact details and verification label.",
            "Stock rows for each blood group and component, with the exact time of the last update shown publicly.",
            "Visibility in the availability search for your district and radius.",
            "A staff account model: owners and editors can update stock; viewers cannot.",
          ],
        },
        {
          heading: "How verification works",
          paragraphs: [
            "An administrator reviews the organisation's name, type, district, public phone and any supporting evidence you send. Verification means we checked those details; it does not mean we audited your licence, your testing, or your clinical practice.",
            "Unverified organisations are labelled as such. Suspended organisations are removed from public search results.",
          ],
        },
        {
          heading: "What we ask of you",
          bullets: [
            "Update stock when it changes materially, and never enter a number you have not confirmed internally.",
            "Do not use the platform to advertise paid blood or to collect donor phone numbers.",
            "Reply to a request through the hospital desk, not by messaging donors outside the consent they gave.",
            "Tell us promptly if your contact details change or your service closes.",
          ],
        },
        {
          heading: "Getting access",
          paragraphs: [
            "Create an account with the staff member's own phone number, then send a request to the operator with the organisation name, district and role. Administrators link accounts manually; there is no self-service claim of an organisation.",
            "There is no fee. We do not take a commission on blood, and we do not sell inventory data.",
          ],
        },
        {
          heading: "Data you can and cannot see",
          paragraphs: [
            "Organisation staff see their own stock and team. They do not receive donor phone lists, donor identities, or other organisations' data. Request pages shown to you contain only what the requester chose to publish.",
            "Every inventory change is written to an audit log with the staff account and time.",
          ],
        },
      ],
    },
    ne: {
      title: "अस्पताल र रक्त बैंकका लागि",
      intro:
        "तपाईंले आन्तरिक रूपमा जनाउने मौजुदात सार्वजनिक गर्नुहोस्, ताकि परिवारले यात्रा गर्नुअघि देख्न सकून्। पहुँच प्रशासकले संस्थासँग जोडेको कर्मचारी खातामा मात्र।",
      sections: [
        {
          heading: "तपाईंले पाउने",
          bullets: [
            "सम्पर्क विवरण र प्रमाणीकरण लेबलसहित सार्वजनिक संस्था पृष्ठ।",
            "प्रत्येक रक्त समूह र कम्पोनेन्टको मौजुदात पंक्ति, अन्तिम अद्यावधिक समयसहित।",
            "आफ्नो जिल्ला र दायराको खोजमा देखिने।",
            "कर्मचारी खाता: मालिक र सम्पादकले मौजुदात अद्यावधिक गर्न सक्छन्; हेर्नेले सक्दैनन्।",
          ],
        },
        {
          heading: "प्रमाणीकरण कसरी हुन्छ",
          paragraphs: [
            "प्रशासकले संस्थाको नाम, प्रकार, जिल्ला, सार्वजनिक फोन र पठाएको प्रमाण जाँच्छन्। प्रमाणित भन्नाले ती विवरण जाँचिएको हो, इजाजत वा चिकित्सकीय अभ्यासको अडिट भएको होइन।",
            "प्रमाणित नभएका संस्था त्यस्तै लेबल हुन्छन्; निलम्बित संस्था सार्वजनिक खोजबाट हटाइन्छन्।",
          ],
        },
        {
          heading: "तपाईंबाट अपेक्षा",
          bullets: [
            "मौजुदात परिवर्तन हुँदा अद्यावधिक गर्नुहोस्; आन्तरिक पुष्टि नगरेको संख्या नलेख्नुहोस्।",
            "पैसा लिने रगतको विज्ञापन वा दाताको फोन नम्बर संकलनका लागि प्रयोग नगर्नुहोस्।",
            "दातालाई सहमति बाहिर सन्देश नपठाई अस्पताल डेस्कमार्फत जवाफ दिनुहोस्।",
            "सम्पर्क विवरण वा सेवा बन्द भएमा तुरुन्त जानकारी दिनुहोस्।",
          ],
        },
        {
          heading: "पहुँच कसरी पाउने",
          paragraphs: [
            "कर्मचारीको आफ्नै फोन नम्बरले खाता बनाउनुहोस्, त्यसपछि संस्थाको नाम, जिल्ला र भूमिकासहित सञ्चालकलाई अनुरोध पठाउनुहोस्। खाता प्रशासकले हस्तक्षेपबाट जोड्छन्; आफैंले संस्था दाबी गर्न मिल्दैन।",
            "कुनै शुल्क छैन। रगतमा कमिसन लिँदैनौं र मौजुदात डाटा बेच्दैनौं।",
          ],
        },
        {
          heading: "कुन डाटा देखिन्छ, कुन देखिँदैन",
          paragraphs: [
            "संस्थाका कर्मचारीले आफ्नै मौजुदात र टोली देख्छन्। दाताको फोन सूची, दाताको पहिचान वा अर्को संस्थाको डाटा पाउँदैनन्।",
            "हरेक मौजुदात परिवर्तन कर्मचारी खाता र समयसहित अडिट लगमा लेखिन्छ।",
          ],
        },
      ],
    },
  },
};
