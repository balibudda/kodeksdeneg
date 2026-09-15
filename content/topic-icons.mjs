// Пиктограммы на уровне тем — не 100 уникальных картинок, а компактная
// переиспользуемая палитра (как и в «Кодексе детства»): 24×24,
// stroke=currentColor, простые примитивы. Часть значков — те же, что уже
// нарисованы для разделов (переиспользуем прямо оттуда), часть — новые,
// под темы, для которых на уровне разделов нет подходящей метафоры.

import { SECTION_ICONS } from './icons.mjs'

export const TOPIC_ICONS = {
  // переиспользованные из палитры разделов
  pristavy: SECTION_ICONS.pristavy,
  kollektory: SECTION_ICONS.kollektory,
  bankrotstvo: SECTION_ICONS.bankrotstvo,
  finansy: SECTION_ICONS.finansy,
  mask: SECTION_ICONS.moshennichestvo,
  'rabota-i-dohod': SECTION_ICONS['rabota-i-dohod'],
  zaymy: SECTION_ICONS.zaymy,
  'semya-i-dengi': SECTION_ICONS['semya-i-dengi'],
  ipoteka: SECTION_ICONS.ipoteka,
  'arenda-i-zhilyo': SECTION_ICONS['arenda-i-zhilyo'],
  'zdorove-i-dengi': SECTION_ICONS['zdorove-i-dengi'],
  'potrebitelskie-prava': SECTION_ICONS['potrebitelskie-prava'],
  'rost-i-svoboda': SECTION_ICONS['rost-i-svoboda'],
  'avto-i-strahovki': SECTION_ICONS['avto-i-strahovki'],
  'zhizn-za-granicey': SECTION_ICONS['zhizn-za-granicey'],

  // новые, специально под темы
  warning: '<path d="M12 3.5l9 16h-18z"/><path d="M12 10v4"/><path d="M12 17v.1"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l4 2.5"/>',
  scales: '<path d="M12 4v16M7 20h10"/><path d="M4 8h6M14 8h6"/><path d="M4 8l-2.5 5a3 3 0 0 0 5 0z"/><path d="M20 8l-2.5 5a3 3 0 0 0 5 0z"/>',
  document: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4"/><path d="M9 12h6M9 15.5h6M9 8.5h3"/>',
  percent: '<circle cx="7" cy="7" r="2.3"/><circle cx="17" cy="17" r="2.3"/><path d="M17 7L7 17"/>',
  card: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10.5h18"/><path d="M6.5 15h4"/>',
  car: '<path d="M4 16V12l2-5h12l2 5v4"/><path d="M4 16h16"/><circle cx="7.5" cy="16.5" r="1.6"/><circle cx="16.5" cy="16.5" r="1.6"/>',
  lock: '<rect x="5.5" y="11" width="13" height="9" rx="2"/><path d="M8 11V7.5a4 4 0 0 1 8 0V11"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L20 20"/>',
}

export function topicIconSvg(slug, size = 15) {
  const key = TOPIC_ICON_MAP[slug]
  const inner = key && TOPIC_ICONS[key]
  if (!inner) return ''
  return `<svg class="ic-svg" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`
}

/** slug темы -> ключ иконки из TOPIC_ICONS */
export const TOPIC_ICON_MAP = {
  // pristavy
  'spisali-dengi-so-scheta': 'pristavy',
  'imushchestvo-i-perechen-isklyucheniy': 'document',
  'zapret-na-vyezd-za-granicu': 'lock',
  'dolg-za-zhkh': 'document',
  'nalogovaya-zadolzhennost-ens': 'document',
  'arest-avtomobilya-invalid': 'car',
  'proizvodstvo-okoncheno-a-trebuyut': 'warning',
  'zhaloba-na-bezdeystvie-pristava': 'scales',
  'oshibochno-chuzhoy-dolg-odnofamilets': 'warning',
  'lishenie-voditelskih-prav-za-dolgi': 'car',
  'shtraf-gibdd-srok-davnosti': 'clock',
  'ispolnitelskiy-sbor-skolko-berut': 'percent',

  // kollektory
  'kollektory-chto-zakonno': 'kollektory',
  'istekla-iskovaya-davnost-kollektory': 'clock',
  'otmena-sudebnogo-prikaza': 'scales',
  'ustupka-dolga-kollektoram-zakonno': 'document',
  'kollektory-zvonyat-rodstvennikam-rabote': 'kollektory',
  'kollektory-ugrozhayut-ugolovnoy-otvetstvennostyu': 'warning',

  // bankrotstvo
  'kogda-vygodno-bankrotstvo': 'bankrotstvo',
  'vnesudebnoe-bankrotstvo-mfc': 'document',
  'finansovyy-upravlyayushchiy-skolko-stoit': 'percent',
  'imushchestvo-supruga-pri-bankrotstve': 'semya-i-dengi',
  'povtornoe-bankrotstvo-cherez-skolko-let': 'clock',
  'subsidiarnaya-otvetstvennost-direktora': 'scales',

  // finansy
  'podushka-bezopasnosti-i-uchet-deneg': 'finansy',
  'vklady-i-strahovanie-asv': 'document',
  'osnovy-investirovaniya-i-piramidy': 'finansy',
  'oshibka-v-kreditnoy-istorii': 'warning',
  'osago-zanizili-vyplatu': 'car',
  'karshering-avariya-i-shtrafy': 'car',
  'blokirovka-karty-115-fz': 'lock',
  'overdraft-chto-eto': 'card',
  'forex-binarnye-opciony-obman': 'warning',
  'nalogovyy-vychet-kak-poluchit': 'document',
  'pensionnye-nakopleniya-perevod-npf': 'finansy',
  'matkapital-na-chto-mozhno-potratit': 'finansy',
  'obnalichivanie-matkapitala-otvetstvennost': 'mask',
  'keshbek-programmy-loyalnosti-podvokhi': 'percent',
  'karta-za-granicey-ne-rabotaet-alternativy': 'card',
  'samozapret-na-kredity': 'lock',
  'zabytye-podpiski-avtoplatezhi': 'card',
  'vklad-kapitalizaciya-protsentov-sravnenie': 'percent',
  'kreditnaya-istoriya-skolko-hranitsya': 'clock',

  // ipoteka
  'ipotechnye-kanikuly-usloviya': 'clock',
  'prosrochka-po-ipoteke-i-torgi': 'warning',
  'strahovanie-zhizni-pri-ipoteke': 'document',
  'matkapital-v-ipoteke-doli-detyam': 'ipoteka',
  'zastroyshchik-bankrot-eskrou': 'bankrotstvo',
  'dosrochnoe-pogashenie-ipoteki-prava': 'percent',
  'semeynaya-ipoteka-usloviya': 'ipoteka',
  'refinansirovanie-ipoteki-kogda-vygodno': 'percent',
  'apartamenty-vs-kvartira-riski': 'ipoteka',

  // moshennichestvo
  'lzheprisatv-po-telefonu': 'kollektory',
  'dolg-rodstvennika-obman': 'kollektory',
  'mnogostupenchataya-shema-razvoda': 'kollektory',
  'proverit-kollektora-v-reestre': 'search',
  'novaya-finansovaya-piramida-2026': 'warning',
  'bezopasnaya-sdelka-marketplejs-obman': 'card',
  'dropper-ne-stat-souchastnikom': 'warning',
  'vzlomali-gosuslugi-kredit-na-vas': 'lock',
  'lzhe-yuristy-spisanie-dolgov': 'mask',
  'arenda-chuzhoy-kvartiry-moshenniki': 'arenda-i-zhilyo',
  'smishing-sms-dostavka-posylka': 'warning',
  'feykovaya-udalenka-predoplata-obuchenie': 'mask',
  'falshivaya-podderzhka-banka-udalennyy-dostup': 'lock',
  'dipfeyk-golos-rodstvennika-ii': 'mask',
  'kriptovalyuta-moshennichestvo-shemy': 'percent',
  'poddelnye-bilety-koncerty-messendzhery': 'card',
  'obmen-valyuty-cherez-telegram-obman': 'card',
  'romanticheskoe-moshennichestvo-znakomstva': 'mask',
  'investicionnye-telegram-kanaly-boty': 'warning',
  'kak-raspoznat-priznaki-manipulyacii-moshennikov': 'warning',
  'poddelnyy-qr-kod-oplata-shtraf-parkovka': 'card',
  'poddelnye-blagotvoritelnye-sbory': 'mask',
  'sim-svop-podmena-nomera-telefona': 'lock',
  'setevoy-marketing-mlm-priznaki-piramidy': 'warning',
  'poddelnyy-vozvrat-naloga-fns-sayt': 'document',
  'poddelnye-sayty-bronirovaniya-otdyha': 'card',
  'videozvonok-deepfake-direktor-shkoly': 'mask',
  'lzhenalogovaya-zvonit-samozanyatym': 'warning',
  'lzheponkupatel-avto-predoplata-sbory': 'car',
  'layki-za-dengi-marketpleys-vovlechenie-v-dropperstvo': 'warning',
  'ugon-telegram-akkaunta-kod-podtverzhdeniya': 'lock',
  'poddelnoe-prilozhenie-banka-apk': 'lock',
  'feykovoe-pismo-sudebnaya-povestka-pristavy': 'document',
  'vyigral-priz-v-loteree-komissiya-za-perevod': 'warning',
  'feykovyy-keshbek-marketpleysa-fishing': 'card',

  // rabota-i-dohod
  'zaderzhka-zarplaty-chto-delat': 'rabota-i-dohod',
  'sokrashchenie-shtata-vyplaty': 'rabota-i-dohod',
  'rezko-upal-dohod-chto-delat': 'warning',
  'samozanyatyy-riski-perekvalifikacii': 'document',
  'chernaya-zarplata-riski': 'warning',
  'diskriminaciya-pri-prieme-na-rabotu': 'scales',
  'ispytatelnyy-srok-uvolnenie': 'clock',
  'samozanyatyy-v-shheme-obnala-risk': 'warning',
  'posobie-po-bezrabotitse-razmer-sroki': 'rabota-i-dohod',
  'pererabotki-sverhurochnye-oplata': 'clock',

  // semya-i-dengi
  'obshchie-dolgi-pri-razvode': 'semya-i-dengi',
  'esli-ne-platyat-alimenty': 'semya-i-dengi',
  'dolgi-po-nasledstvu': 'document',
  'dolg-umershego-otvechayut-li-nasledniki': 'document',
  'brachnyy-dogovor-chto-zashchishchaet': 'document',
  'sovmestno-nazhitoe-imushchestvo': 'semya-i-dengi',
  'alimenty-na-soderzhanie-roditeley': 'semya-i-dengi',
  'vyplaty-semyam-uchastnikov-svo': 'document',
  'nasledstvo-bez-zaveshchaniya-ocheredi': 'document',

  // zaymy
  'skolko-realno-mozhno-trebovat-po-mfo': 'zaymy',
  'kak-proverit-mfo-v-reestre-cb': 'search',
  'dolgovaya-spiral-perekreditovanie': 'warning',
  'kreditnaya-karta-lgotnyy-period-podvokhi': 'card',
  'lombard-zalog-veshchey-vykup': 'zaymy',
  'zaym-pod-zalog-avto-pts': 'car',
  'kreditnye-kanikuly-dlya-uchastnikov-svo': 'clock',
  'strahovanie-pri-potrebkredite-navyazyvanie': 'document',

  // zdorove-i-dengi
  'oms-otkazali-v-lechenii': 'zdorove-i-dengi',
  'nekachestvennaya-platnaya-medicina-vozvrat': 'zdorove-i-dengi',
  'bolnichnyy-ne-oplatili-zaderzhka': 'clock',
  'dms-otkaz-v-vyplate': 'document',
  'invalidnost-kak-oformit-lgoty': 'zdorove-i-dengi',
  'turisticheskaya-strahovka-chto-pokryvaet': 'document',

  // arenda-i-zhilyo
  'arendodatel-ne-vozvrashchaet-zalog': 'arenda-i-zhilyo',
  'moshennichestvo-pri-arende-predoplata': 'mask',
  'povyshenie-arendnoy-platy-i-vyselenie': 'document',
  'rieltor-komissiya-bez-rezultata': 'percent',
  'dolgi-zhkh-predydushchego-sobstvennika': 'document',

  // potrebitelskie-prava
  'vozvrat-kachestvennogo-tovara-14-dney': 'potrebitelskie-prava',
  'tovar-s-brakom-remont-zamena-vozvrat': 'warning',
  'internet-magazin-ne-privez-tovar': 'potrebitelskie-prava',
  'wildberries-ozon-zablokirovali-kabinet': 'lock',
  'otmenili-aviareys-vozvrat-deneg': 'clock',

  // доп. темы в finansy/zaymy
  'edinoe-posobie-na-detey': 'finansy',
  'kriptovaluta-legalnost-nalogi': 'document',
  'iis-tip-a-tip-b-chto-vybrat': 'finansy',
  'kasko-otkaz-v-vyplate': 'car',
  'avtokredit-prosrochka-izyatie-avto': 'car',

  // ещё одна партия — займы под жильё, авто с рук, соцвыплаты, дарение, брокеры
  'zaym-pod-zalog-kvartiry-u-chastnika': 'zaymy',
  'strahovka-ot-poteri-raboty-vozvrat': 'document',
  'avto-s-ruk-skruchennyy-probeg-defekty': 'car',
  'samozanyatyy-prevysil-limit-dohoda': 'document',
  'kompensaciya-pri-uvolnenii-po-soglasheniyu-storon': 'document',
  'dekretnye-vyplaty-uhod-za-rebenkom': 'rabota-i-dohod',
  'nalog-na-darenie-nedvizhimosti': 'percent',
  'prodazha-doli-v-kvartire-preimushchestvennoe-pravo': 'document',
  'kreditnyy-broker-moshenniki-predoplata': 'mask',
  'vznosy-na-kapremont-kto-mozhet-ne-platit': 'document',

  // третья партия — расписки, недвижимость, отпуск, транспорт, ЭЦП
  'raspiska-o-zayme-mezhdu-fizlicami': 'document',
  'protsenty-za-prosrochku-st-395-gk': 'percent',
  'zadatok-vs-avans-pri-pokupke-nedvizhimosti': 'document',
  'egrn-vypiska-pered-pokupkoy-kvartiry': 'search',
  'materialnaya-otvetstvennost-nedostacha': 'warning',
  'nayem-nyani-domrabotnicy-nalogi': 'document',
  'kompensaciya-za-otpusk-pri-uvolnenii': 'rabota-i-dohod',
  'vozvrat-zhd-bileta-pravila-sroki': 'clock',
  'taksi-obman-cena-otvetstvennost-agregatora': 'car',
  'elektronnaya-podpis-moshenniki-nedvizhimost': 'lock',

  // четвёртая партия — ДДУ, ЖКУ перерасчёт, туры, регресс, валюта, казино, травма, совмещение
  'neustoyka-zastroyshchika-za-prosrochku-ddu': 'clock',
  'pereraschet-za-nekachestvennye-kommunalnye-uslugi': 'percent',
  'vozvrat-deneg-za-turputevku': 'document',
  'regress-osago-k-vinovniku-dtp': 'car',
  'perevody-za-granicu-limity-valyutnyy-kontrol': 'lock',
  'onlayn-kazino-stavki-na-sport-legalnost': 'warning',
  'neschastnyy-sluchay-na-proizvodstve-vyplaty': 'rabota-i-dohod',
  'sovmeshchenie-dolzhnostey-doplata': 'document',

  // пятая партия — потребправа: неустойка, услуги, доставка, подписки, реклама
  'neustoyka-1-procent-v-den-zozpp': 'percent',
  'nekachestvennaya-usluga-remont-parikmaherskaya': 'potrebitelskie-prava',
  'dostavka-edy-ne-tot-zakaz-isporchennaya': 'potrebitelskie-prava',
  'fitnes-abonement-klub-zakrylsya-vozvrat': 'document',
  'navyazannye-podpiski-mobilnyy-operator': 'card',
  'himchistka-isportila-veshch': 'warning',
  'navyazyvayut-dopuslugi-avtoservis-salon': 'warning',
  'vozvrat-cifrovyh-tovarov-igr-prilozheniy': 'card',
  'tamozhennaya-poshlina-aliexpress-limit': 'document',
  'nedostovernaya-reklama-zhaloba-fas': 'warning',

  // шестая партия — НДФЛ по вкладам, техосмотр, региональный маткапитал,
  // ОСАГО при продаже, алименты-индексация, льготы многодетным, дольщики, ИП
  'ndfl-s-procentov-po-vkladam': 'percent',
  'tekhosmotr-kogda-obyazatelen-shtraf': 'car',
  'regionalnyy-matkapital-tretiy-rebenok': 'finansy',
  'vozvrat-strahovki-osago-pri-prodazhe-avto': 'car',
  'indeksaciya-alimentov-tverdaya-summa': 'semya-i-dengi',
  'lgoty-mnogodetnym-nalog-imushchestvo-zemlya': 'percent',
  'obmanutye-dolshchiki-peredacha-nedostroya': 'bankrotstvo',
  'ip-npd-otkaz-usn-30-dney': 'document',
  'fiksirovannye-vznosy-ip-obyazatelny': 'percent',
  'zakrytie-ip-s-dolgami': 'warning',
  'oshibka-v-cheke-samozanyatogo': 'document',

  // седьмая партия — кредит для друга, поручитель, созаёмщик
  'vzyal-kredit-dlya-druga-ne-otdaet': 'warning',
  'poruchitel-po-kreditu-riski': 'document',
  'sozaemshchik-vs-poruchitel-otlichiya': 'document',

  // восьмая партия — жизнь за границей, арест имущества, самострой, скот
  'zagranpasport-za-granicey-sroki': 'clock',
  'uvedomlenie-o-vtorom-grazhdanstve-vnzh': 'document',
  'uvedomlenie-fns-schet-za-rubezhom': 'document',
  'arest-imushchestva-uehavshih-168-fz': 'lock',
  'kompensaciya-za-izyatyy-unichtozhennyy-skot': 'percent',
  'snos-samovolnoy-postroyki-bez-kompensacii': 'warning',

  // девятая партия — музыка в заведении (РАО/ВОИС), реклама в Instagram
  'muzyka-v-zavedenii-shtraf-rao-vois': 'warning',
  'reklama-v-instagram-zapret-shtraf': 'warning',
}
