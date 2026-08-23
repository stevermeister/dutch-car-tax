export type Lang = 'nl' | 'en';

export interface Translations {
  h1: string;
  metaTitle: string;
  metaDescription: string;
  ogLocale: string;
  ogLocaleAlternate: string;
  canonicalUrl: string;
  subtitle: string;
  introTitle: string;
  intro: string;
  faqTitle: string;
  faqs: Array<{ q: string; a: string }>;
  searchBtn: string;
  invalidPlate: string;
  notFound: string;
  province: string;
  vehicleWeight: string;
  weightBasisNote: string;
  oldtimerExempt: string;
  monthly: string;
  quarterly: string;
  yearly: string;
  noscript: string;
  fuelLabels: Record<string, string>;
}

export const BASE_URL = 'https://car.thetax.nl';

export const TRANSLATIONS: Record<Lang, Translations> = {
  nl: {
    h1: 'Wegenbelasting (MRB) berekenen 2026 op kenteken',
    metaTitle: 'Wegenbelasting Berekenen 2026 | MRB Calculator op Kenteken',
    metaDescription:
      'Bereken je motorrijtuigenbelasting (MRB) 2026 op kenteken. ' +
      'Automatische voertuiggegevens via RDW. Bedrag per maand, kwartaal en jaar — gratis en zonder reclame.',
    ogLocale: 'nl_NL',
    ogLocaleAlternate: 'en_US',
    canonicalUrl: `${BASE_URL}/`,
    intro:
      'Motorrijtuigenbelasting (MRB) is de belasting die je betaalt voor het rijden op de openbare weg ' +
      'in Nederland. Het bedrag hangt af van drie factoren: het gewicht van je voertuig ' +
      '(massa rijklaar), het type brandstof, en de provincie waarin je woont — elke provincie ' +
      'heeft eigen opcenten die bovenop het rijkstarief komen.' +
      '\n\n' +
      'Per 1 januari 2026 zijn er belangrijke wijzigingen: plug-in hybrides (PHEV) verliezen hun ' +
      'MRB-korting volledig en betalen nu hetzelfde tarief als gewone benzineauto\'s. Volledig ' +
      'elektrische voertuigen houden een korting, maar betalen vanaf 2026 70% van het benzine-tarief. ' +
      'De oldtimerregeling blijft van kracht: voertuigen van 40 jaar en ouder zijn vrijgesteld van MRB.' +
      '\n\n' +
      'Met deze calculator bereken je het kwartaaltarief op basis van kenteken. De voertuiggegevens ' +
      '— gewicht en brandstoftype — worden automatisch opgehaald uit de RDW-database. Je kunt het ' +
      'bedrag weergeven per maand, kwartaal of jaar.',
    subtitle: 'Bereken in seconden hoeveel motorrijtuigenbelasting je betaalt. Voer je kenteken in — wij halen automatisch het gewicht en brandstoftype op via RDW.',
    introTitle: 'Hoe werkt deze berekening?',
    faqTitle: 'Veelgestelde vragen over wegenbelasting (MRB)',
    faqs: [
      {
        q: 'Wat is wegenbelasting (MRB)?',
        a: 'Motorrijtuigenbelasting (MRB) is een kwartaalbelasting die je betaalt voor het gebruik van ' +
           'een motorvoertuig op de openbare weg. Het tarief hangt af van het gewicht van het voertuig, ' +
           'het brandstoftype en de provincie waar je woont.',
      },
      {
        q: 'Hoe vaak betaal ik MRB?',
        a: 'MRB wordt berekend per tijdvak van drie maanden (kwartaal). Je kunt ook kiezen om per maand ' +
           'of per jaar te betalen via de Belastingdienst, maar het kwartaaltarief is de officiële maatstaf.',
      },
      {
        q: 'Wat verandert er in 2026 voor elektrische auto\'s en plug-in hybrides?',
        a: 'Plug-in hybrides (PHEV) verliezen per 1 januari 2026 hun MRB-korting volledig en betalen ' +
           'hetzelfde tarief als benzineauto\'s. Volledig elektrische voertuigen betalen in 2026 nog 70% ' +
           'van het benzine-tarief; deze korting wordt afgebouwd tot 25% in 2029 en verdwijnt volledig in 2030.',
      },
      {
        q: 'Welke provincie heeft de laagste opcenten?',
        a: 'Noord-Holland heeft de laagste provinciale opcenten (82,1% in 2026), gevolgd door Overijssel ' +
           'met 82,2%, vrijwel gelijk. Zuid-Holland heeft de hoogste opcenten (104,4%), wat resulteert in de hoogste MRB.',
      },
      {
        q: 'Geldt er een vrijstelling voor oldtimers?',
        a: 'Personenauto\'s van 40 jaar of ouder zijn volledig vrijgesteld van MRB en mogen het hele jaar ' +
           'rijden. Voor benzine- en LPG-voertuigen tussen 26 en 40 jaar geldt een overgangsregeling: ' +
           'ongeveer 25% van het normale tarief, mits je niet rijdt in januari, februari en december. ' +
           'Let op: vanaf 2028 geldt de volledige vrijstelling alleen nog voor voertuigen gebouwd vóór 1988.',
      },
    ],
    searchBtn: 'Zoeken',
    invalidPlate: 'Voer een geldig Nederlands kenteken in (bijv. AB-123-C).',
    notFound: 'Geen voertuig gevonden voor dit kenteken.',
    province: 'Provincie',
    vehicleWeight: 'Massa rijklaar',
    weightBasisNote: 'Basis: massa rijklaar (sinds 1 juli 2026)',
    oldtimerExempt: 'Oldtimer — 40 jaar of ouder, vrijgesteld van MRB',
    monthly: 'Maand',
    quarterly: 'Kwartaal',
    yearly: 'Jaar',
    noscript: 'Schakel JavaScript in om de wegenbelasting calculator te gebruiken. / Please enable JavaScript to use the road tax calculator.',
    fuelLabels: {
      Benzine: 'Benzine',
      Diesel: 'Diesel',
      Elektrisch: 'Elektrisch',
      LPG3: 'LPG3',
      LPG: 'LPG',
    },
  },

  en: {
    h1: 'Dutch Road Tax (MRB) Calculator 2026',
    metaTitle: 'Dutch Road Tax Calculator 2026 | MRB by Licence Plate',
    metaDescription:
      'Calculate your Dutch road tax (MRB) for 2026 by license plate. ' +
      'Automatic vehicle data via RDW. Amount per month, quarter, and year — free and ad-free.',
    ogLocale: 'en_US',
    ogLocaleAlternate: 'nl_NL',
    canonicalUrl: `${BASE_URL}/en/`,
    intro:
      'Dutch road tax (motorrijtuigenbelasting, MRB) is the tax you pay to drive on public roads in ' +
      'the Netherlands. The amount depends on three factors: your vehicle\'s kerb weight ' +
      '(massa rijklaar), fuel type, and the province you live in — each province adds its own ' +
      'surcharge (opcenten) on top of the national base rate.' +
      '\n\n' +
      'From 1 January 2026, significant changes apply: plug-in hybrids (PHEVs) lose their MRB ' +
      'discount entirely and now pay the same rate as regular petrol cars. Fully electric vehicles ' +
      'retain a discount but pay 70% of the petrol rate from 2026. The full EV exemption ended in ' +
      '2025. The classic car exemption remains: vehicles 40 years or older are exempt from road tax.' +
      '\n\n' +
      'This calculator determines your quarterly road tax from your licence plate. Vehicle data — ' +
      'weight and fuel type — are fetched automatically from the Dutch RDW registration database. ' +
      'You can view the amount per month, quarter, or year.',
    subtitle: 'Calculate your Dutch road tax in seconds. Enter your license plate — we\'ll fetch weight and fuel type automatically via RDW.',
    introTitle: 'How is this calculated?',
    faqTitle: 'Frequently asked questions about Dutch road tax (MRB)',
    faqs: [
      {
        q: 'What is Dutch road tax (MRB)?',
        a: 'Motorrijtuigenbelasting (MRB) is a quarterly tax you pay for using a motor vehicle on ' +
           'public roads in the Netherlands. The rate depends on the vehicle\'s kerb weight (massa ' +
           'rijklaar), fuel type, and the province where you live.',
      },
      {
        q: 'How often do I pay MRB?',
        a: 'MRB is calculated per three-month period (quarter). You can choose to pay monthly or ' +
           'annually via the Belastingdienst, but the quarterly amount is the official reference rate.',
      },
      {
        q: 'What changes in 2026 for EVs and plug-in hybrids?',
        a: 'Plug-in hybrids (PHEVs) lose their MRB discount entirely from 1 January 2026 and pay ' +
           'the same rate as petrol cars. Fully electric vehicles still pay 70% of the petrol rate in ' +
           '2026; this discount is reduced to 25% in 2029 and disappears entirely in 2030.',
      },
      {
        q: 'Which province has the lowest opcenten?',
        a: 'Noord-Holland has the lowest provincial surcharge (82.1% in 2026), followed by Overijssel ' +
           'at 82.2%, almost identical. Zuid-Holland has the highest surcharge (104.4%), resulting in the highest road tax.',
      },
      {
        q: 'Is there an exemption for classic cars?',
        a: 'Passenger cars 40 years or older are fully exempt from MRB and may drive year-round. ' +
           'For petrol and LPG vehicles between 26 and 40 years old, a transitional scheme applies: ' +
           'roughly 25% of the standard rate, provided you don\'t drive in January, February, or December. ' +
           'Note: from 2028, the full exemption applies only to vehicles built before 1988.',
      },
    ],
    searchBtn: 'Search',
    invalidPlate: 'Enter a valid Dutch plate (e.g. AB-123-C).',
    notFound: 'No vehicle found for this plate number.',
    province: 'Province',
    vehicleWeight: 'Kerb weight (massa rijklaar)',
    weightBasisNote: 'Basis: kerb weight / massa rijklaar (as of 1 July 2026)',
    oldtimerExempt: 'Classic car — 40 years or older, exempt from road tax',
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    yearly: 'Yearly',
    noscript: 'Please enable JavaScript to use the road tax calculator. / Schakel JavaScript in om de wegenbelasting calculator te gebruiken.',
    fuelLabels: {
      Benzine: 'Petrol',
      Diesel: 'Diesel',
      Elektrisch: 'Electric',
      LPG3: 'LPG3',
      LPG: 'LPG',
    },
  },
};
