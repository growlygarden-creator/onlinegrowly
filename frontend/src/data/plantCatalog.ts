import type { PlantCatalogItem } from "../lib/api";

export const bundledPlantCatalog: PlantCatalogItem[] = [
  {
    "id": "pepper_california_wonder",
    "kind": "cultivar",
    "profile_id": "pepper",
    "variant_id": "pepper_sweet",
    "cultivar_id": "pepper_california_wonder",
    "name": "California Wonder paprika",
    "display_name": "California Wonder paprika",
    "subtitle": "paprika · blokkpaprika",
    "family": "varmeelskende fruktgrønnsak",
    "icon": "🫑",
    "tone": "pepper",
    "ranges": {
      "airTemperature": {
        "optimal": [
          21.0,
          26.0
        ],
        "caution": [
          18.0,
          32.0
        ]
      },
      "airHumidity": {
        "optimal": [
          60.0,
          75.0
        ],
        "caution": [
          50.0,
          80.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          65.0,
          85.0
        ],
        "caution": [
          50.0,
          90.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          18.0,
          22.0
        ],
        "caution": [
          15.0,
          26.0
        ]
      },
      "ph": {
        "optimal": [
          5.8,
          6.8
        ],
        "caution": [
          5.5,
          7.5
        ]
      },
      "lux": {
        "optimal": [
          25000.0,
          60000.0
        ],
        "caution": [
          15000.0,
          70000.0
        ]
      }
    },
    "notes": "Klassisk blokkpaprika for drivhus; trenger varm jord og jevn fukt.",
    "watering": "Jevnt fuktig jord, ikke la tørke helt ut.",
    "seed_guide": {
      "sow": "Så inne i februar-mars.",
      "start": "Startes inne tidlig, varmt og lyst.",
      "repot": "Pottes om når røttene fyller småpotten.",
      "plant_out": "Settes i drivhus fra mai-juni.",
      "harvest": "Høstes fra juli og utover."
    },
    "category": "grønnsak",
    "latin_name": "Capsicum annuum"
  },
  {
    "id": "basil_dark_opal",
    "kind": "cultivar",
    "profile_id": "basil",
    "variant_id": "basil_genovese",
    "cultivar_id": "basil_dark_opal",
    "name": "Dark Opal basilikum",
    "display_name": "Dark Opal basilikum",
    "subtitle": "basilikum · basilikum Genovese",
    "family": "varmeelskende urt",
    "icon": "🌿",
    "tone": "basil",
    "ranges": {
      "airTemperature": {
        "optimal": [
          16.0,
          22.0
        ],
        "caution": [
          10.0,
          27.0
        ]
      },
      "airHumidity": {
        "optimal": [
          55.0,
          75.0
        ],
        "caution": [
          45.0,
          85.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          50.0,
          75.0
        ],
        "caution": [
          40.0,
          85.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          14.0,
          20.0
        ],
        "caution": [
          8.0,
          24.0
        ]
      },
      "ph": {
        "optimal": [
          6.0,
          7.0
        ],
        "caution": [
          5.5,
          7.5
        ]
      },
      "lux": {
        "optimal": [
          12000.0,
          30000.0
        ],
        "caution": [
          8000.0,
          35000.0
        ]
      }
    },
    "notes": "Mørk dekorativ basilikum med samme klimakrav som Genovese.",
    "watering": "Jevnt lett fuktig jord, ikke la potten tørke helt ut.",
    "seed_guide": {
      "sow": "Så inne i mars-mai.",
      "start": "Startes inne varmt, lyst og uten trekk.",
      "repot": "Prikles eller pottes om når plantene kan håndteres.",
      "plant_out": "Trives best i drivhus eller varm vinduskarm.",
      "harvest": "Toppes og høstes jevnlig gjennom sesongen."
    },
    "category": "urt",
    "latin_name": "Ocimum basilicum"
  },
  {
    "id": "strawberry_elsanta",
    "kind": "cultivar",
    "profile_id": "strawberry",
    "variant_id": "strawberry_june",
    "cultivar_id": "strawberry_elsanta",
    "name": "Elsanta jordbær",
    "display_name": "Elsanta jordbær",
    "subtitle": "jordbær · sommerbærende jordbær",
    "family": "bær flerårig",
    "icon": "🍓",
    "tone": "berry",
    "ranges": {
      "airTemperature": {
        "optimal": [
          16.0,
          22.0
        ],
        "caution": [
          6.0,
          24.0
        ]
      },
      "airHumidity": {
        "optimal": [
          60.0,
          75.0
        ],
        "caution": [
          50.0,
          90.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          55.0,
          75.0
        ],
        "caution": [
          45.0,
          85.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          12.0,
          18.0
        ],
        "caution": [
          8.0,
          22.0
        ]
      },
      "ph": {
        "optimal": [
          5.3,
          6.5
        ],
        "caution": [
          5.0,
          6.8
        ]
      },
      "lux": {
        "optimal": [
          20000.0,
          42000.0
        ],
        "caution": [
          15000.0,
          50000.0
        ]
      }
    },
    "notes": "Vanlig tidlig sort; ganske fast frukt, følsom for gråmugg ved høy fukt.",
    "watering": "Jevnt fuktig jord, ikke la potter tørke helt ut.",
    "seed_guide": {
      "sow": "Plantes vanligvis som småplanter vår eller sensommer.",
      "start": "Kan stå i potter/kasser i drivhus.",
      "repot": "Pottes om ved tett rotklump eller før ny sesong.",
      "plant_out": "Settes ut eller i drivhus når faren for hard frost er over.",
      "harvest": "Bærer vanligvis fra juni, remonterende sorter lengre."
    },
    "category": "bær",
    "latin_name": "Fragaria × ananassa"
  },
  {
    "id": "basil_genovese_cult",
    "kind": "cultivar",
    "profile_id": "basil",
    "variant_id": "basil_genovese",
    "cultivar_id": "basil_genovese_cult",
    "name": "Genovese basilikum",
    "display_name": "Genovese basilikum",
    "subtitle": "basilikum · basilikum Genovese",
    "family": "varmeelskende urt",
    "icon": "🌿",
    "tone": "basil",
    "ranges": {
      "airTemperature": {
        "optimal": [
          16.0,
          22.0
        ],
        "caution": [
          10.0,
          27.0
        ]
      },
      "airHumidity": {
        "optimal": [
          55.0,
          75.0
        ],
        "caution": [
          45.0,
          85.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          50.0,
          75.0
        ],
        "caution": [
          40.0,
          85.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          14.0,
          20.0
        ],
        "caution": [
          8.0,
          24.0
        ]
      },
      "ph": {
        "optimal": [
          6.0,
          7.0
        ],
        "caution": [
          5.5,
          7.5
        ]
      },
      "lux": {
        "optimal": [
          12000.0,
          30000.0
        ],
        "caution": [
          8000.0,
          35000.0
        ]
      }
    },
    "notes": "Standard storbladet basilikum for potter og drivhus.",
    "watering": "Jevnt lett fuktig jord, ikke la potten tørke helt ut.",
    "seed_guide": {
      "sow": "Så inne i mars-mai.",
      "start": "Startes inne varmt, lyst og uten trekk.",
      "repot": "Prikles eller pottes om når plantene kan håndteres.",
      "plant_out": "Trives best i drivhus eller varm vinduskarm.",
      "harvest": "Toppes og høstes jevnlig gjennom sesongen."
    },
    "category": "urt",
    "latin_name": "Ocimum basilicum"
  },
  {
    "id": "pepper_habanero",
    "kind": "cultivar",
    "profile_id": "chili",
    "variant_id": "pepper_hot",
    "cultivar_id": "pepper_habanero",
    "name": "Habanero chili",
    "display_name": "Habanero chili",
    "subtitle": "chili · chilipepper",
    "family": "varmeelskende chili",
    "icon": "🌶️",
    "tone": "pepper",
    "ranges": {
      "airTemperature": {
        "optimal": [
          21.0,
          26.0
        ],
        "caution": [
          18.0,
          34.0
        ]
      },
      "airHumidity": {
        "optimal": [
          60.0,
          75.0
        ],
        "caution": [
          50.0,
          80.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          55.0,
          75.0
        ],
        "caution": [
          50.0,
          90.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          18.0,
          22.0
        ],
        "caution": [
          15.0,
          26.0
        ]
      },
      "ph": {
        "optimal": [
          5.8,
          6.8
        ],
        "caution": [
          5.5,
          7.5
        ]
      },
      "lux": {
        "optimal": [
          25000.0,
          65000.0
        ],
        "caution": [
          15000.0,
          70000.0
        ]
      }
    },
    "notes": "Varmekrevende chili; krever mye lys og jevn temperatur.",
    "watering": "Jevnt fuktig jord, ikke la tørke helt ut.",
    "seed_guide": {
      "sow": "Så inne i januar-mars.",
      "start": "Startes inne tidlig med varme og mye lys.",
      "repot": "Pottes om gradvis for sterk rotvekst.",
      "plant_out": "Settes i drivhus når temperaturen holder seg stabil.",
      "harvest": "Høstes fra sensommeren og utover."
    },
    "category": "grønnsak",
    "latin_name": "Capsicum annuum"
  },
  {
    "id": "pepper_jalapeno",
    "kind": "cultivar",
    "profile_id": "chili",
    "variant_id": "pepper_hot",
    "cultivar_id": "pepper_jalapeno",
    "name": "Jalapeño chili",
    "display_name": "Jalapeño chili",
    "subtitle": "chili · chilipepper",
    "family": "varmeelskende chili",
    "icon": "🌶️",
    "tone": "pepper",
    "ranges": {
      "airTemperature": {
        "optimal": [
          21.0,
          26.0
        ],
        "caution": [
          18.0,
          34.0
        ]
      },
      "airHumidity": {
        "optimal": [
          60.0,
          75.0
        ],
        "caution": [
          50.0,
          80.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          55.0,
          75.0
        ],
        "caution": [
          50.0,
          90.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          18.0,
          22.0
        ],
        "caution": [
          15.0,
          26.0
        ]
      },
      "ph": {
        "optimal": [
          5.8,
          6.8
        ],
        "caution": [
          5.5,
          7.5
        ]
      },
      "lux": {
        "optimal": [
          25000.0,
          65000.0
        ],
        "caution": [
          15000.0,
          70000.0
        ]
      }
    },
    "notes": "Kompakt sterk chili; trives varmt og lyst, tåler litt tørrere jord.",
    "watering": "Jevnt fuktig jord, ikke la tørke helt ut.",
    "seed_guide": {
      "sow": "Så inne i januar-mars.",
      "start": "Startes inne tidlig med varme og mye lys.",
      "repot": "Pottes om gradvis for sterk rotvekst.",
      "plant_out": "Settes i drivhus når temperaturen holder seg stabil.",
      "harvest": "Høstes fra sensommeren og utover."
    },
    "category": "grønnsak",
    "latin_name": "Capsicum annuum"
  },
  {
    "id": "lettuce_little_gem",
    "kind": "cultivar",
    "profile_id": "lettuce",
    "variant_id": "lettuce_romaine",
    "cultivar_id": "lettuce_little_gem",
    "name": "Little Gem romansalat",
    "display_name": "Little Gem romansalat",
    "subtitle": "salat · romanosalat",
    "family": "kjølig bladgrønt",
    "icon": "🥬",
    "tone": "leafy",
    "ranges": {
      "airTemperature": {
        "optimal": [
          14.0,
          20.0
        ],
        "caution": [
          6.0,
          25.0
        ]
      },
      "airHumidity": {
        "optimal": [
          60.0,
          75.0
        ],
        "caution": [
          50.0,
          90.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          55.0,
          75.0
        ],
        "caution": [
          45.0,
          85.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          8.0,
          16.0
        ],
        "caution": [
          4.0,
          20.0
        ]
      },
      "ph": {
        "optimal": [
          6.0,
          7.0
        ],
        "caution": [
          5.5,
          7.5
        ]
      },
      "lux": {
        "optimal": [
          12000.0,
          33000.0
        ],
        "caution": [
          8000.0,
          35000.0
        ]
      }
    },
    "notes": "Liten, kompakt romansalat; egnet til potter og kasser.",
    "watering": "Jevnt lett fuktig jord, ikke la den tørke helt ut.",
    "seed_guide": {
      "sow": "Så inne eller direkte fra mars-august.",
      "start": "Kan forkultiveres i pluggbrett for tidligere avling.",
      "repot": "Pottes/plantes om når småplantene er håndterbare.",
      "plant_out": "Settes ut/drivhus når jorda er kjølig og fuktig.",
      "harvest": "Høstes fortløpende etter størrelse."
    },
    "category": "grønnsak",
    "latin_name": "Lactuca sativa"
  },
  {
    "id": "lettuce_lollo_rossa",
    "kind": "cultivar",
    "profile_id": "lettuce",
    "variant_id": "lettuce_leaf",
    "cultivar_id": "lettuce_lollo_rossa",
    "name": "Lollo Rossa plukksalat",
    "display_name": "Lollo Rossa plukksalat",
    "subtitle": "salat · plukksalat",
    "family": "kjølig bladgrønt",
    "icon": "🥬",
    "tone": "leafy",
    "ranges": {
      "airTemperature": {
        "optimal": [
          14.0,
          20.0
        ],
        "caution": [
          6.0,
          26.0
        ]
      },
      "airHumidity": {
        "optimal": [
          60.0,
          75.0
        ],
        "caution": [
          50.0,
          90.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          55.0,
          75.0
        ],
        "caution": [
          45.0,
          85.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          8.0,
          16.0
        ],
        "caution": [
          4.0,
          20.0
        ]
      },
      "ph": {
        "optimal": [
          6.0,
          7.0
        ],
        "caution": [
          5.5,
          7.5
        ]
      },
      "lux": {
        "optimal": [
          12000.0,
          30000.0
        ],
        "caution": [
          8000.0,
          35000.0
        ]
      }
    },
    "notes": "Krusete rød plukksalat; tåler en del varme, men går i stokk ved langvarig tørke.",
    "watering": "Jevnt lett fuktig jord, ikke la den tørke helt ut.",
    "seed_guide": {
      "sow": "Så inne eller direkte fra mars-august.",
      "start": "Kan forkultiveres i pluggbrett for tidligere avling.",
      "repot": "Pottes/plantes om når småplantene er håndterbare.",
      "plant_out": "Settes ut/drivhus når jorda er kjølig og fuktig.",
      "harvest": "Høstes fortløpende etter størrelse."
    },
    "category": "grønnsak",
    "latin_name": "Lactuca sativa"
  },
  {
    "id": "strawberry_malling_opal",
    "kind": "cultivar",
    "profile_id": "strawberry",
    "variant_id": "strawberry_everbearing",
    "cultivar_id": "strawberry_malling_opal",
    "name": "Malling Opal jordbær",
    "display_name": "Malling Opal jordbær",
    "subtitle": "jordbær · remonterende jordbær",
    "family": "bær flerårig",
    "icon": "🍓",
    "tone": "berry",
    "ranges": {
      "airTemperature": {
        "optimal": [
          16.0,
          22.0
        ],
        "caution": [
          8.0,
          27.0
        ]
      },
      "airHumidity": {
        "optimal": [
          60.0,
          75.0
        ],
        "caution": [
          50.0,
          80.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          55.0,
          75.0
        ],
        "caution": [
          45.0,
          85.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          12.0,
          18.0
        ],
        "caution": [
          8.0,
          22.0
        ]
      },
      "ph": {
        "optimal": [
          5.3,
          6.5
        ],
        "caution": [
          5.0,
          6.8
        ]
      },
      "lux": {
        "optimal": [
          20000.0,
          50000.0
        ],
        "caution": [
          15000.0,
          50000.0
        ]
      }
    },
    "notes": "Remonterende sort for lang sesong i drivhus og potter.",
    "watering": "Jevnt fuktig jord, ikke la potter tørke helt ut.",
    "seed_guide": {
      "sow": "Plantes vanligvis som småplanter vår eller sensommer.",
      "start": "Kan stå i potter/kasser i drivhus.",
      "repot": "Pottes om ved tett rotklump eller før ny sesong.",
      "plant_out": "Settes ut eller i drivhus når faren for hard frost er over.",
      "harvest": "Bærer vanligvis fra juni, remonterende sorter lengre."
    },
    "category": "bær",
    "latin_name": "Fragaria × ananassa"
  },
  {
    "id": "cucumber_marketmore",
    "kind": "cultivar",
    "profile_id": "cucumber",
    "variant_id": "cucumber_slicing",
    "cultivar_id": "cucumber_marketmore",
    "name": "Marketmore salatagurk",
    "display_name": "Marketmore salatagurk",
    "subtitle": "agurk · salatagurk",
    "family": "varmeelskende fruktgrønnsak",
    "icon": "🥒",
    "tone": "cucumber",
    "ranges": {
      "airTemperature": {
        "optimal": [
          21.0,
          26.0
        ],
        "caution": [
          18.0,
          32.0
        ]
      },
      "airHumidity": {
        "optimal": [
          60.0,
          75.0
        ],
        "caution": [
          50.0,
          85.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          65.0,
          85.0
        ],
        "caution": [
          50.0,
          90.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          18.0,
          22.0
        ],
        "caution": [
          15.0,
          26.0
        ]
      },
      "ph": {
        "optimal": [
          5.8,
          6.8
        ],
        "caution": [
          5.5,
          7.5
        ]
      },
      "lux": {
        "optimal": [
          25000.0,
          60000.0
        ],
        "caution": [
          15000.0,
          70000.0
        ]
      }
    },
    "notes": "Robust salatagurk; egnet til hobbydrivhus.",
    "watering": "Jevnt fuktig jord, ikke la tørke helt ut.",
    "seed_guide": {
      "sow": "Så inne i april-mai.",
      "start": "Forkultiveres kort inne, helst varmt.",
      "repot": "Pottes forsiktig om uten å forstyrre røttene for mye.",
      "plant_out": "Plantes i drivhus fra mai-juni.",
      "harvest": "Høstes ofte fra juni/juli."
    },
    "category": "grønnsak",
    "latin_name": "Cucumis sativus"
  },
  {
    "id": "mint_moroccan",
    "kind": "cultivar",
    "profile_id": "mint",
    "variant_id": "mint_strong",
    "cultivar_id": "mint_moroccan",
    "name": "Marokkansk mynte",
    "display_name": "Marokkansk mynte",
    "subtitle": "mynte · sterk mynte",
    "family": "flerårig urt",
    "icon": "🌿",
    "tone": "leafy",
    "ranges": {
      "airTemperature": {
        "optimal": [
          16.0,
          22.0
        ],
        "caution": [
          10.0,
          27.0
        ]
      },
      "airHumidity": {
        "optimal": [
          55.0,
          75.0
        ],
        "caution": [
          45.0,
          85.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          50.0,
          75.0
        ],
        "caution": [
          40.0,
          85.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          14.0,
          20.0
        ],
        "caution": [
          8.0,
          24.0
        ]
      },
      "ph": {
        "optimal": [
          6.0,
          7.0
        ],
        "caution": [
          5.5,
          7.5
        ]
      },
      "lux": {
        "optimal": [
          12000.0,
          30000.0
        ],
        "caution": [
          8000.0,
          35000.0
        ]
      }
    },
    "notes": "Sterk mynte til te; liker fuktig jord og mye lys.",
    "watering": "Jevnt lett fuktig jord, ikke la potten tørke helt ut.",
    "seed_guide": {
      "sow": "Så inne fra mars-mai.",
      "start": "Startes lyst og jevnt fuktig.",
      "repot": "Pottes om når planten har god rotklump.",
      "plant_out": "Kan stå i drivhus, potte eller varm krok.",
      "harvest": "Høstes jevnlig ved å klippe skudd/topper."
    },
    "category": "urt",
    "latin_name": "Mentha spp."
  },
  {
    "id": "tomato_roma",
    "kind": "cultivar",
    "profile_id": "tomato",
    "variant_id": "tomato_plum",
    "cultivar_id": "tomato_roma",
    "name": "Roma plommetomat",
    "display_name": "Roma plommetomat",
    "subtitle": "tomat · plommetomat",
    "family": "varmeelskende fruktgrønnsak",
    "icon": "🍅",
    "tone": "tomato",
    "ranges": {
      "airTemperature": {
        "optimal": [
          21.0,
          26.0
        ],
        "caution": [
          18.0,
          33.0
        ]
      },
      "airHumidity": {
        "optimal": [
          60.0,
          75.0
        ],
        "caution": [
          50.0,
          80.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          60.0,
          80.0
        ],
        "caution": [
          50.0,
          90.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          18.0,
          22.0
        ],
        "caution": [
          15.0,
          26.0
        ]
      },
      "ph": {
        "optimal": [
          5.8,
          6.8
        ],
        "caution": [
          5.5,
          7.5
        ]
      },
      "lux": {
        "optimal": [
          25000.0,
          60000.0
        ],
        "caution": [
          15000.0,
          70000.0
        ]
      }
    },
    "notes": "Plommetomat for saus; trenger jevn fukt for å unngå sprekking.",
    "watering": "Jevnt fuktig jord, ikke la tørke helt ut.",
    "seed_guide": {
      "sow": "Så inne i mars-april.",
      "start": "Forkultiveres inne lyst og varmt.",
      "repot": "Pottes om når planten har 2-4 varige blad.",
      "plant_out": "Plantes i drivhus fra mai når nettene er stabile.",
      "harvest": "Høstes vanligvis juli-september."
    },
    "category": "grønnsak",
    "latin_name": "Solanum lycopersicum"
  },
  {
    "id": "tomato_sanmarzano",
    "kind": "cultivar",
    "profile_id": "tomato",
    "variant_id": "tomato_plum",
    "cultivar_id": "tomato_sanmarzano",
    "name": "San Marzano",
    "display_name": "San Marzano",
    "subtitle": "tomat · plommetomat",
    "family": "varmeelskende fruktgrønnsak",
    "icon": "🍅",
    "tone": "tomato",
    "ranges": {
      "airTemperature": {
        "optimal": [
          21.0,
          26.0
        ],
        "caution": [
          18.0,
          33.0
        ]
      },
      "airHumidity": {
        "optimal": [
          60.0,
          75.0
        ],
        "caution": [
          50.0,
          80.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          60.0,
          80.0
        ],
        "caution": [
          50.0,
          90.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          18.0,
          22.0
        ],
        "caution": [
          15.0,
          26.0
        ]
      },
      "ph": {
        "optimal": [
          5.8,
          6.8
        ],
        "caution": [
          5.5,
          7.5
        ]
      },
      "lux": {
        "optimal": [
          25000.0,
          60000.0
        ],
        "caution": [
          15000.0,
          70000.0
        ]
      }
    },
    "notes": "Italiensk saus-tomat; liker varme og god drenering, jevn vanning.",
    "watering": "Jevnt fuktig jord, ikke la tørke helt ut.",
    "seed_guide": {
      "sow": "Så inne i mars-april.",
      "start": "Forkultiveres inne lyst og varmt.",
      "repot": "Pottes om når planten har 2-4 varige blad.",
      "plant_out": "Plantes i drivhus fra mai når nettene er stabile.",
      "harvest": "Høstes vanligvis juli-september."
    },
    "category": "grønnsak",
    "latin_name": "Solanum lycopersicum"
  },
  {
    "id": "tomato_shirley",
    "kind": "cultivar",
    "profile_id": "tomato",
    "variant_id": "tomato_standard",
    "cultivar_id": "tomato_shirley",
    "name": "Shirley tomat",
    "display_name": "Shirley tomat",
    "subtitle": "tomat · vanlig tomat",
    "family": "varmeelskende fruktgrønnsak",
    "icon": "🍅",
    "tone": "tomato",
    "ranges": {
      "airTemperature": {
        "optimal": [
          21.0,
          26.0
        ],
        "caution": [
          18.0,
          32.0
        ]
      },
      "airHumidity": {
        "optimal": [
          60.0,
          75.0
        ],
        "caution": [
          50.0,
          85.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          60.0,
          80.0
        ],
        "caution": [
          50.0,
          90.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          18.0,
          22.0
        ],
        "caution": [
          15.0,
          26.0
        ]
      },
      "ph": {
        "optimal": [
          5.8,
          6.8
        ],
        "caution": [
          5.5,
          7.5
        ]
      },
      "lux": {
        "optimal": [
          25000.0,
          60000.0
        ],
        "caution": [
          15000.0,
          70000.0
        ]
      }
    },
    "notes": "Klassisk drivhustomat; forholdsvis robust for norske forhold.",
    "watering": "Jevnt fuktig jord, ikke la tørke helt ut.",
    "seed_guide": {
      "sow": "Så inne i mars-april.",
      "start": "Forkultiveres inne lyst og varmt.",
      "repot": "Pottes om når planten har 2-4 varige blad.",
      "plant_out": "Plantes i drivhus fra mai når nettene er stabile.",
      "harvest": "Høstes vanligvis juli-september."
    },
    "category": "grønnsak",
    "latin_name": "Solanum lycopersicum"
  },
  {
    "id": "cucumber_socrates",
    "kind": "cultivar",
    "profile_id": "cucumber",
    "variant_id": "cucumber_snack",
    "cultivar_id": "cucumber_socrates",
    "name": "Socrates snackagurk",
    "display_name": "Socrates snackagurk",
    "subtitle": "agurk · snackagurk",
    "family": "varmeelskende fruktgrønnsak",
    "icon": "🥒",
    "tone": "cucumber",
    "ranges": {
      "airTemperature": {
        "optimal": [
          21.0,
          26.0
        ],
        "caution": [
          19.0,
          33.0
        ]
      },
      "airHumidity": {
        "optimal": [
          60.0,
          75.0
        ],
        "caution": [
          50.0,
          85.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          60.0,
          80.0
        ],
        "caution": [
          50.0,
          90.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          18.0,
          22.0
        ],
        "caution": [
          15.0,
          26.0
        ]
      },
      "ph": {
        "optimal": [
          5.8,
          6.8
        ],
        "caution": [
          5.5,
          7.5
        ]
      },
      "lux": {
        "optimal": [
          25000.0,
          65000.0
        ],
        "caution": [
          15000.0,
          70000.0
        ]
      }
    },
    "notes": "Miniagurk som gir jevn avling i varmt drivhus.",
    "watering": "Jevnt fuktig jord, ikke la tørke helt ut.",
    "seed_guide": {
      "sow": "Så inne i april-mai.",
      "start": "Forkultiveres kort inne, helst varmt.",
      "repot": "Pottes forsiktig om uten å forstyrre røttene for mye.",
      "plant_out": "Plantes i drivhus fra mai-juni.",
      "harvest": "Høstes ofte fra juni/juli."
    },
    "category": "grønnsak",
    "latin_name": "Cucumis sativus"
  },
  {
    "id": "tomato_sungold",
    "kind": "cultivar",
    "profile_id": "tomato",
    "variant_id": "tomato_cherry",
    "cultivar_id": "tomato_sungold",
    "name": "Sungold cherrytomat",
    "display_name": "Sungold cherrytomat",
    "subtitle": "tomat · cherrytomat",
    "family": "varmeelskende fruktgrønnsak",
    "icon": "🍅",
    "tone": "tomato",
    "ranges": {
      "airTemperature": {
        "optimal": [
          21.0,
          26.0
        ],
        "caution": [
          18.0,
          34.0
        ]
      },
      "airHumidity": {
        "optimal": [
          60.0,
          75.0
        ],
        "caution": [
          50.0,
          85.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          60.0,
          80.0
        ],
        "caution": [
          50.0,
          90.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          18.0,
          22.0
        ],
        "caution": [
          15.0,
          26.0
        ]
      },
      "ph": {
        "optimal": [
          5.8,
          6.8
        ],
        "caution": [
          5.5,
          7.5
        ]
      },
      "lux": {
        "optimal": [
          25000.0,
          65000.0
        ],
        "caution": [
          15000.0,
          70000.0
        ]
      }
    },
    "notes": "Søt oransje cherrytomat; liker høy varme og jevn fukt, svært sprekk-sensitiv.",
    "watering": "Jevnt fuktig jord, ikke la tørke helt ut.",
    "seed_guide": {
      "sow": "Så inne i mars-april.",
      "start": "Forkultiveres inne lyst og varmt.",
      "repot": "Pottes om når planten har 2-4 varige blad.",
      "plant_out": "Plantes i drivhus fra mai når nettene er stabile.",
      "harvest": "Høstes vanligvis juli-september."
    },
    "category": "grønnsak",
    "latin_name": "Solanum lycopersicum"
  },
  {
    "id": "basil_genovese",
    "kind": "variant",
    "profile_id": "basil",
    "variant_id": "basil_genovese",
    "cultivar_id": null,
    "name": "basilikum Genovese",
    "display_name": "basilikum Genovese",
    "subtitle": "basilikum · klassisk storbladet",
    "family": "varmeelskende urt",
    "icon": "🌿",
    "tone": "basil",
    "ranges": {
      "airTemperature": {
        "optimal": [
          16.0,
          22.0
        ],
        "caution": [
          10.0,
          27.0
        ]
      },
      "airHumidity": {
        "optimal": [
          55.0,
          75.0
        ],
        "caution": [
          45.0,
          85.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          50.0,
          75.0
        ],
        "caution": [
          40.0,
          85.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          14.0,
          20.0
        ],
        "caution": [
          8.0,
          24.0
        ]
      },
      "ph": {
        "optimal": [
          6.0,
          7.0
        ],
        "caution": [
          5.5,
          7.5
        ]
      },
      "lux": {
        "optimal": [
          12000.0,
          30000.0
        ],
        "caution": [
          8000.0,
          35000.0
        ]
      }
    },
    "notes": "Trenger varme, lys og jevn fukt; svært kuldefølsom.",
    "watering": "Jevnt lett fuktig jord, ikke la potten tørke helt ut.",
    "seed_guide": {
      "sow": "Så inne i mars-mai.",
      "start": "Startes inne varmt, lyst og uten trekk.",
      "repot": "Prikles eller pottes om når plantene kan håndteres.",
      "plant_out": "Trives best i drivhus eller varm vinduskarm.",
      "harvest": "Toppes og høstes jevnlig gjennom sesongen."
    },
    "category": "urt",
    "latin_name": "Ocimum basilicum"
  },
  {
    "id": "tomato_beefsteak",
    "kind": "variant",
    "profile_id": "tomato",
    "variant_id": "tomato_beefsteak",
    "cultivar_id": null,
    "name": "bifftomat",
    "display_name": "bifftomat",
    "subtitle": "tomat · store frukter",
    "family": "varmeelskende fruktgrønnsak",
    "icon": "🍅",
    "tone": "tomato",
    "ranges": {
      "airTemperature": {
        "optimal": [
          21.0,
          26.0
        ],
        "caution": [
          18.0,
          32.0
        ]
      },
      "airHumidity": {
        "optimal": [
          60.0,
          75.0
        ],
        "caution": [
          50.0,
          80.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          65.0,
          85.0
        ],
        "caution": [
          50.0,
          90.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          18.0,
          22.0
        ],
        "caution": [
          15.0,
          26.0
        ]
      },
      "ph": {
        "optimal": [
          5.8,
          6.8
        ],
        "caution": [
          5.5,
          7.5
        ]
      },
      "lux": {
        "optimal": [
          25000.0,
          60000.0
        ],
        "caution": [
          15000.0,
          70000.0
        ]
      }
    },
    "notes": "Store frukter krever jevn fukt og god lufting for å unngå sprekk og gråmugg.",
    "watering": "Jevnt fuktig jord, ikke la tørke helt ut.",
    "seed_guide": {
      "sow": "Så inne i mars-april.",
      "start": "Forkultiveres inne lyst og varmt.",
      "repot": "Pottes om når planten har 2-4 varige blad.",
      "plant_out": "Plantes i drivhus fra mai når nettene er stabile.",
      "harvest": "Høstes vanligvis juli-september."
    },
    "category": "grønnsak",
    "latin_name": "Solanum lycopersicum"
  },
  {
    "id": "pepper_sweet",
    "kind": "variant",
    "profile_id": "pepper",
    "variant_id": "pepper_sweet",
    "cultivar_id": null,
    "name": "blokkpaprika",
    "display_name": "blokkpaprika",
    "subtitle": "paprika · store søte frukter",
    "family": "varmeelskende fruktgrønnsak",
    "icon": "🫑",
    "tone": "pepper",
    "ranges": {
      "airTemperature": {
        "optimal": [
          21.0,
          26.0
        ],
        "caution": [
          18.0,
          32.0
        ]
      },
      "airHumidity": {
        "optimal": [
          60.0,
          75.0
        ],
        "caution": [
          50.0,
          80.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          65.0,
          85.0
        ],
        "caution": [
          50.0,
          90.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          18.0,
          22.0
        ],
        "caution": [
          15.0,
          26.0
        ]
      },
      "ph": {
        "optimal": [
          5.8,
          6.8
        ],
        "caution": [
          5.5,
          7.5
        ]
      },
      "lux": {
        "optimal": [
          25000.0,
          60000.0
        ],
        "caution": [
          15000.0,
          70000.0
        ]
      }
    },
    "notes": "Store frukter, noe mer følsom for ujevn fukt og høy luftfukt enn små paprika.",
    "watering": "Jevnt fuktig jord, ikke la tørke helt ut.",
    "seed_guide": {
      "sow": "Så inne i februar-mars.",
      "start": "Startes inne tidlig, varmt og lyst.",
      "repot": "Pottes om når røttene fyller småpotten.",
      "plant_out": "Settes i drivhus fra mai-juni.",
      "harvest": "Høstes fra juli og utover."
    },
    "category": "grønnsak",
    "latin_name": "Capsicum annuum"
  },
  {
    "id": "tomato_cherry",
    "kind": "variant",
    "profile_id": "tomato",
    "variant_id": "tomato_cherry",
    "cultivar_id": null,
    "name": "cherrytomat",
    "display_name": "cherrytomat",
    "subtitle": "tomat · små frukter, klaser",
    "family": "varmeelskende fruktgrønnsak",
    "icon": "🍅",
    "tone": "tomato",
    "ranges": {
      "airTemperature": {
        "optimal": [
          21.0,
          26.0
        ],
        "caution": [
          18.0,
          34.0
        ]
      },
      "airHumidity": {
        "optimal": [
          60.0,
          75.0
        ],
        "caution": [
          50.0,
          85.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          60.0,
          80.0
        ],
        "caution": [
          50.0,
          90.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          18.0,
          22.0
        ],
        "caution": [
          15.0,
          26.0
        ]
      },
      "ph": {
        "optimal": [
          5.8,
          6.8
        ],
        "caution": [
          5.5,
          7.5
        ]
      },
      "lux": {
        "optimal": [
          25000.0,
          65000.0
        ],
        "caution": [
          15000.0,
          70000.0
        ]
      }
    },
    "notes": "Kompakte planter med mange små frukter; tåler ofte litt høyere varme men er følsom for ujevn vanning (sprekk).",
    "watering": "Jevnt fuktig jord, ikke la tørke helt ut.",
    "seed_guide": {
      "sow": "Så inne i mars-april.",
      "start": "Forkultiveres inne lyst og varmt.",
      "repot": "Pottes om når planten har 2-4 varige blad.",
      "plant_out": "Plantes i drivhus fra mai når nettene er stabile.",
      "harvest": "Høstes vanligvis juli-september."
    },
    "category": "grønnsak",
    "latin_name": "Solanum lycopersicum"
  },
  {
    "id": "pepper_hot",
    "kind": "variant",
    "profile_id": "chili",
    "variant_id": "pepper_hot",
    "cultivar_id": null,
    "name": "chilipepper",
    "display_name": "chilipepper",
    "subtitle": "chili · sterke frukter",
    "family": "varmeelskende chili",
    "icon": "🌶️",
    "tone": "pepper",
    "ranges": {
      "airTemperature": {
        "optimal": [
          21.0,
          26.0
        ],
        "caution": [
          18.0,
          34.0
        ]
      },
      "airHumidity": {
        "optimal": [
          60.0,
          75.0
        ],
        "caution": [
          50.0,
          80.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          55.0,
          75.0
        ],
        "caution": [
          50.0,
          90.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          18.0,
          22.0
        ],
        "caution": [
          15.0,
          26.0
        ]
      },
      "ph": {
        "optimal": [
          5.8,
          6.8
        ],
        "caution": [
          5.5,
          7.5
        ]
      },
      "lux": {
        "optimal": [
          25000.0,
          65000.0
        ],
        "caution": [
          15000.0,
          70000.0
        ]
      }
    },
    "notes": "Tåler ofte litt høyere varme og litt tørrere jord, men er følsom for høy luftfukt og stillestående luft.",
    "watering": "Jevnt fuktig jord, ikke la tørke helt ut.",
    "seed_guide": {
      "sow": "Så inne i januar-mars.",
      "start": "Startes inne tidlig med varme og mye lys.",
      "repot": "Pottes om gradvis for sterk rotvekst.",
      "plant_out": "Settes i drivhus når temperaturen holder seg stabil.",
      "harvest": "Høstes fra sensommeren og utover."
    },
    "category": "grønnsak",
    "latin_name": "Capsicum annuum"
  },
  {
    "id": "lettuce_head",
    "kind": "variant",
    "profile_id": "lettuce",
    "variant_id": "lettuce_head",
    "cultivar_id": null,
    "name": "hodesalat",
    "display_name": "hodesalat",
    "subtitle": "salat · kompakte hoder",
    "family": "kjølig bladgrønt",
    "icon": "🥬",
    "tone": "leafy",
    "ranges": {
      "airTemperature": {
        "optimal": [
          14.0,
          20.0
        ],
        "caution": [
          4.0,
          22.0
        ]
      },
      "airHumidity": {
        "optimal": [
          60.0,
          75.0
        ],
        "caution": [
          50.0,
          95.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          55.0,
          75.0
        ],
        "caution": [
          45.0,
          85.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          8.0,
          16.0
        ],
        "caution": [
          4.0,
          20.0
        ]
      },
      "ph": {
        "optimal": [
          6.0,
          7.0
        ],
        "caution": [
          5.5,
          7.5
        ]
      },
      "lux": {
        "optimal": [
          12000.0,
          27000.0
        ],
        "caution": [
          8000.0,
          35000.0
        ]
      }
    },
    "notes": "Trives best kjølig; går lett i stokk ved høy varme og tørke.",
    "watering": "Jevnt lett fuktig jord, ikke la den tørke helt ut.",
    "seed_guide": {
      "sow": "Så inne eller direkte fra mars-august.",
      "start": "Kan forkultiveres i pluggbrett for tidligere avling.",
      "repot": "Pottes/plantes om når småplantene er håndterbare.",
      "plant_out": "Settes ut/drivhus når jorda er kjølig og fuktig.",
      "harvest": "Høstes fortløpende etter størrelse."
    },
    "category": "grønnsak",
    "latin_name": "Lactuca sativa"
  },
  {
    "id": "lavender_compact",
    "kind": "variant",
    "profile_id": "lavender",
    "variant_id": "lavender_compact",
    "cultivar_id": null,
    "name": "kompakt lavendel",
    "display_name": "kompakt lavendel",
    "subtitle": "lavendel · lav og tett vekst",
    "family": "middelhavsurt",
    "icon": "🌱",
    "tone": "berry",
    "ranges": {
      "airTemperature": {
        "optimal": [
          18.0,
          26.0
        ],
        "caution": [
          10.0,
          32.0
        ]
      },
      "airHumidity": {
        "optimal": [
          40.0,
          60.0
        ],
        "caution": [
          30.0,
          65.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          25.0,
          45.0
        ],
        "caution": [
          20.0,
          60.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          16.0,
          22.0
        ],
        "caution": [
          10.0,
          26.0
        ]
      },
      "ph": {
        "optimal": [
          6.5,
          7.5
        ],
        "caution": [
          6.0,
          8.0
        ]
      },
      "lux": {
        "optimal": [
          20000.0,
          55000.0
        ],
        "caution": [
          12000.0,
          60000.0
        ]
      }
    },
    "notes": "God i potter; krever svært god drenering og mye lys.",
    "watering": "Sparsom vanning, la jorden tørke godt opp mellom hver gang.",
    "seed_guide": {
      "sow": "Start inne vår eller plant som småplante etter behov.",
      "start": "Gi lys, moderat varme og jevn fukt.",
      "repot": "Pottes om når røttene fyller potten.",
      "plant_out": "Settes i drivhus/krukke når veksten er i gang.",
      "harvest": "Følg blomstring/fruktsetting gjennom sesongen."
    },
    "category": "blomst",
    "latin_name": "Lavandula angustifolia"
  },
  {
    "id": "rosemary_upright",
    "kind": "variant",
    "profile_id": "rosemary",
    "variant_id": "rosemary_upright",
    "cultivar_id": null,
    "name": "oppreist rosmarin",
    "display_name": "oppreist rosmarin",
    "subtitle": "rosmarin · buskform",
    "family": "middelhavsurt",
    "icon": "🌿",
    "tone": "leafy",
    "ranges": {
      "airTemperature": {
        "optimal": [
          18.0,
          26.0
        ],
        "caution": [
          10.0,
          32.0
        ]
      },
      "airHumidity": {
        "optimal": [
          40.0,
          60.0
        ],
        "caution": [
          30.0,
          65.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          25.0,
          45.0
        ],
        "caution": [
          20.0,
          60.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          16.0,
          22.0
        ],
        "caution": [
          10.0,
          26.0
        ]
      },
      "ph": {
        "optimal": [
          6.5,
          7.5
        ],
        "caution": [
          6.0,
          8.0
        ]
      },
      "lux": {
        "optimal": [
          20000.0,
          55000.0
        ],
        "caution": [
          12000.0,
          60000.0
        ]
      }
    },
    "notes": "Tåler mye varme og tørke, men reagerer raskt på for våt jord.",
    "watering": "Sparsom vanning, la jorden tørke godt opp mellom hver gang.",
    "seed_guide": {
      "sow": "Så inne fra mars-mai.",
      "start": "Startes lyst og jevnt fuktig.",
      "repot": "Pottes om når planten har god rotklump.",
      "plant_out": "Kan stå i drivhus, potte eller varm krok.",
      "harvest": "Høstes jevnlig ved å klippe skudd/topper."
    },
    "category": "urt",
    "latin_name": "Salvia rosmarinus"
  },
  {
    "id": "tomato_plum",
    "kind": "variant",
    "profile_id": "tomato",
    "variant_id": "tomato_plum",
    "cultivar_id": null,
    "name": "plommetomat",
    "display_name": "plommetomat",
    "subtitle": "tomat · avling/sause",
    "family": "varmeelskende fruktgrønnsak",
    "icon": "🍅",
    "tone": "tomato",
    "ranges": {
      "airTemperature": {
        "optimal": [
          21.0,
          26.0
        ],
        "caution": [
          18.0,
          33.0
        ]
      },
      "airHumidity": {
        "optimal": [
          60.0,
          75.0
        ],
        "caution": [
          50.0,
          80.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          60.0,
          80.0
        ],
        "caution": [
          50.0,
          90.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          18.0,
          22.0
        ],
        "caution": [
          15.0,
          26.0
        ]
      },
      "ph": {
        "optimal": [
          5.8,
          6.8
        ],
        "caution": [
          5.5,
          7.5
        ]
      },
      "lux": {
        "optimal": [
          25000.0,
          60000.0
        ],
        "caution": [
          15000.0,
          70000.0
        ]
      }
    },
    "notes": "Ofte dyrket for saus; tåler varme, men krever jevn vanning for å unngå sprekking.",
    "watering": "Jevnt fuktig jord, ikke la tørke helt ut.",
    "seed_guide": {
      "sow": "Så inne i mars-april.",
      "start": "Forkultiveres inne lyst og varmt.",
      "repot": "Pottes om når planten har 2-4 varige blad.",
      "plant_out": "Plantes i drivhus fra mai når nettene er stabile.",
      "harvest": "Høstes vanligvis juli-september."
    },
    "category": "grønnsak",
    "latin_name": "Solanum lycopersicum"
  },
  {
    "id": "lettuce_leaf",
    "kind": "variant",
    "profile_id": "lettuce",
    "variant_id": "lettuce_leaf",
    "cultivar_id": null,
    "name": "plukksalat",
    "display_name": "plukksalat",
    "subtitle": "salat · løse blader",
    "family": "kjølig bladgrønt",
    "icon": "🥬",
    "tone": "leafy",
    "ranges": {
      "airTemperature": {
        "optimal": [
          14.0,
          20.0
        ],
        "caution": [
          6.0,
          26.0
        ]
      },
      "airHumidity": {
        "optimal": [
          60.0,
          75.0
        ],
        "caution": [
          50.0,
          90.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          55.0,
          75.0
        ],
        "caution": [
          45.0,
          85.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          8.0,
          16.0
        ],
        "caution": [
          4.0,
          20.0
        ]
      },
      "ph": {
        "optimal": [
          6.0,
          7.0
        ],
        "caution": [
          5.5,
          7.5
        ]
      },
      "lux": {
        "optimal": [
          12000.0,
          30000.0
        ],
        "caution": [
          8000.0,
          35000.0
        ]
      }
    },
    "notes": "Tåler ofte litt mer varme og høsting over tid enn hodesalat.",
    "watering": "Jevnt lett fuktig jord, ikke la den tørke helt ut.",
    "seed_guide": {
      "sow": "Så inne eller direkte fra mars-august.",
      "start": "Kan forkultiveres i pluggbrett for tidligere avling.",
      "repot": "Pottes/plantes om når småplantene er håndterbare.",
      "plant_out": "Settes ut/drivhus når jorda er kjølig og fuktig.",
      "harvest": "Høstes fortløpende etter størrelse."
    },
    "category": "grønnsak",
    "latin_name": "Lactuca sativa"
  },
  {
    "id": "strawberry_everbearing",
    "kind": "variant",
    "profile_id": "strawberry",
    "variant_id": "strawberry_everbearing",
    "cultivar_id": null,
    "name": "remonterende jordbær",
    "display_name": "remonterende jordbær",
    "subtitle": "jordbær · bærer gjennom sesongen",
    "family": "bær flerårig",
    "icon": "🍓",
    "tone": "berry",
    "ranges": {
      "airTemperature": {
        "optimal": [
          16.0,
          22.0
        ],
        "caution": [
          8.0,
          27.0
        ]
      },
      "airHumidity": {
        "optimal": [
          60.0,
          75.0
        ],
        "caution": [
          50.0,
          80.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          55.0,
          75.0
        ],
        "caution": [
          45.0,
          85.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          12.0,
          18.0
        ],
        "caution": [
          8.0,
          22.0
        ]
      },
      "ph": {
        "optimal": [
          5.3,
          6.5
        ],
        "caution": [
          5.0,
          6.8
        ]
      },
      "lux": {
        "optimal": [
          20000.0,
          50000.0
        ],
        "caution": [
          15000.0,
          50000.0
        ]
      }
    },
    "notes": "Bærer lenge; tåler ofte mer varme og lys, men krever jevn fukt for fin bærkvalitet.",
    "watering": "Jevnt fuktig jord, ikke la potter tørke helt ut.",
    "seed_guide": {
      "sow": "Plantes vanligvis som småplanter vår eller sensommer.",
      "start": "Kan stå i potter/kasser i drivhus.",
      "repot": "Pottes om ved tett rotklump eller før ny sesong.",
      "plant_out": "Settes ut eller i drivhus når faren for hard frost er over.",
      "harvest": "Bærer vanligvis fra juni, remonterende sorter lengre."
    },
    "category": "bær",
    "latin_name": "Fragaria × ananassa"
  },
  {
    "id": "lettuce_romaine",
    "kind": "variant",
    "profile_id": "lettuce",
    "variant_id": "lettuce_romaine",
    "cultivar_id": null,
    "name": "romanosalat",
    "display_name": "romanosalat",
    "subtitle": "salat · avlange hoder",
    "family": "kjølig bladgrønt",
    "icon": "🥬",
    "tone": "leafy",
    "ranges": {
      "airTemperature": {
        "optimal": [
          14.0,
          20.0
        ],
        "caution": [
          6.0,
          25.0
        ]
      },
      "airHumidity": {
        "optimal": [
          60.0,
          75.0
        ],
        "caution": [
          50.0,
          90.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          55.0,
          75.0
        ],
        "caution": [
          45.0,
          85.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          8.0,
          16.0
        ],
        "caution": [
          4.0,
          20.0
        ]
      },
      "ph": {
        "optimal": [
          6.0,
          7.0
        ],
        "caution": [
          5.5,
          7.5
        ]
      },
      "lux": {
        "optimal": [
          12000.0,
          33000.0
        ],
        "caution": [
          8000.0,
          35000.0
        ]
      }
    },
    "notes": "Tåler ofte litt mer varme og lys enn hodesalat, men liker fortsatt jevn fukt.",
    "watering": "Jevnt lett fuktig jord, ikke la den tørke helt ut.",
    "seed_guide": {
      "sow": "Så inne eller direkte fra mars-august.",
      "start": "Kan forkultiveres i pluggbrett for tidligere avling.",
      "repot": "Pottes/plantes om når småplantene er håndterbare.",
      "plant_out": "Settes ut/drivhus når jorda er kjølig og fuktig.",
      "harvest": "Høstes fortløpende etter størrelse."
    },
    "category": "grønnsak",
    "latin_name": "Lactuca sativa"
  },
  {
    "id": "cucumber_slicing",
    "kind": "variant",
    "profile_id": "cucumber",
    "variant_id": "cucumber_slicing",
    "cultivar_id": null,
    "name": "salatagurk",
    "display_name": "salatagurk",
    "subtitle": "agurk · lange frukter",
    "family": "varmeelskende fruktgrønnsak",
    "icon": "🥒",
    "tone": "cucumber",
    "ranges": {
      "airTemperature": {
        "optimal": [
          21.0,
          26.0
        ],
        "caution": [
          18.0,
          32.0
        ]
      },
      "airHumidity": {
        "optimal": [
          60.0,
          75.0
        ],
        "caution": [
          50.0,
          85.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          65.0,
          85.0
        ],
        "caution": [
          50.0,
          90.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          18.0,
          22.0
        ],
        "caution": [
          15.0,
          26.0
        ]
      },
      "ph": {
        "optimal": [
          5.8,
          6.8
        ],
        "caution": [
          5.5,
          7.5
        ]
      },
      "lux": {
        "optimal": [
          25000.0,
          60000.0
        ],
        "caution": [
          15000.0,
          70000.0
        ]
      }
    },
    "notes": "Klassisk drivhusagurk med høyt vann- og fuktbehov.",
    "watering": "Jevnt fuktig jord, ikke la tørke helt ut.",
    "seed_guide": {
      "sow": "Så inne i april-mai.",
      "start": "Forkultiveres kort inne, helst varmt.",
      "repot": "Pottes forsiktig om uten å forstyrre røttene for mye.",
      "plant_out": "Plantes i drivhus fra mai-juni.",
      "harvest": "Høstes ofte fra juni/juli."
    },
    "category": "grønnsak",
    "latin_name": "Cucumis sativus"
  },
  {
    "id": "basil_lemon",
    "kind": "variant",
    "profile_id": "basil",
    "variant_id": "basil_lemon",
    "cultivar_id": null,
    "name": "sitronbasilikum",
    "display_name": "sitronbasilikum",
    "subtitle": "basilikum · aromatisk, tynnere blader",
    "family": "varmeelskende urt",
    "icon": "🌿",
    "tone": "basil",
    "ranges": {
      "airTemperature": {
        "optimal": [
          16.0,
          22.0
        ],
        "caution": [
          10.0,
          27.0
        ]
      },
      "airHumidity": {
        "optimal": [
          55.0,
          75.0
        ],
        "caution": [
          45.0,
          80.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          45.0,
          70.0
        ],
        "caution": [
          40.0,
          85.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          14.0,
          20.0
        ],
        "caution": [
          8.0,
          24.0
        ]
      },
      "ph": {
        "optimal": [
          6.0,
          7.0
        ],
        "caution": [
          5.5,
          7.5
        ]
      },
      "lux": {
        "optimal": [
          12000.0,
          35000.0
        ],
        "caution": [
          8000.0,
          35000.0
        ]
      }
    },
    "notes": "Tåler ofte litt tørrere jord og mer lys enn storbladet basilikum.",
    "watering": "Jevnt lett fuktig jord, ikke la potten tørke helt ut.",
    "seed_guide": {
      "sow": "Så inne i mars-mai.",
      "start": "Startes inne varmt, lyst og uten trekk.",
      "repot": "Prikles eller pottes om når plantene kan håndteres.",
      "plant_out": "Trives best i drivhus eller varm vinduskarm.",
      "harvest": "Toppes og høstes jevnlig gjennom sesongen."
    },
    "category": "urt",
    "latin_name": "Ocimum basilicum"
  },
  {
    "id": "cucumber_snack",
    "kind": "variant",
    "profile_id": "cucumber",
    "variant_id": "cucumber_snack",
    "cultivar_id": null,
    "name": "snackagurk",
    "display_name": "snackagurk",
    "subtitle": "agurk · små frukter",
    "family": "varmeelskende fruktgrønnsak",
    "icon": "🥒",
    "tone": "cucumber",
    "ranges": {
      "airTemperature": {
        "optimal": [
          21.0,
          26.0
        ],
        "caution": [
          19.0,
          33.0
        ]
      },
      "airHumidity": {
        "optimal": [
          60.0,
          75.0
        ],
        "caution": [
          50.0,
          85.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          60.0,
          80.0
        ],
        "caution": [
          50.0,
          90.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          18.0,
          22.0
        ],
        "caution": [
          15.0,
          26.0
        ]
      },
      "ph": {
        "optimal": [
          5.8,
          6.8
        ],
        "caution": [
          5.5,
          7.5
        ]
      },
      "lux": {
        "optimal": [
          25000.0,
          65000.0
        ],
        "caution": [
          15000.0,
          70000.0
        ]
      }
    },
    "notes": "Kompakte planter, tåler litt høyere varme og lys, men krever fortsatt høy jordfukt.",
    "watering": "Jevnt fuktig jord, ikke la tørke helt ut.",
    "seed_guide": {
      "sow": "Så inne i april-mai.",
      "start": "Forkultiveres kort inne, helst varmt.",
      "repot": "Pottes forsiktig om uten å forstyrre røttene for mye.",
      "plant_out": "Plantes i drivhus fra mai-juni.",
      "harvest": "Høstes ofte fra juni/juli."
    },
    "category": "grønnsak",
    "latin_name": "Cucumis sativus"
  },
  {
    "id": "strawberry_june",
    "kind": "variant",
    "profile_id": "strawberry",
    "variant_id": "strawberry_june",
    "cultivar_id": null,
    "name": "sommerbærende jordbær",
    "display_name": "sommerbærende jordbær",
    "subtitle": "jordbær · en hovedavling",
    "family": "bær flerårig",
    "icon": "🍓",
    "tone": "berry",
    "ranges": {
      "airTemperature": {
        "optimal": [
          16.0,
          22.0
        ],
        "caution": [
          6.0,
          24.0
        ]
      },
      "airHumidity": {
        "optimal": [
          60.0,
          75.0
        ],
        "caution": [
          50.0,
          90.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          55.0,
          75.0
        ],
        "caution": [
          45.0,
          85.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          12.0,
          18.0
        ],
        "caution": [
          8.0,
          22.0
        ]
      },
      "ph": {
        "optimal": [
          5.3,
          6.5
        ],
        "caution": [
          5.0,
          6.8
        ]
      },
      "lux": {
        "optimal": [
          20000.0,
          42000.0
        ],
        "caution": [
          15000.0,
          50000.0
        ]
      }
    },
    "notes": "Klassiske sorter med én hovedavling; foretrekker kjøligere klima.",
    "watering": "Jevnt fuktig jord, ikke la potter tørke helt ut.",
    "seed_guide": {
      "sow": "Plantes vanligvis som småplanter vår eller sensommer.",
      "start": "Kan stå i potter/kasser i drivhus.",
      "repot": "Pottes om ved tett rotklump eller før ny sesong.",
      "plant_out": "Settes ut eller i drivhus når faren for hard frost er over.",
      "harvest": "Bærer vanligvis fra juni, remonterende sorter lengre."
    },
    "category": "bær",
    "latin_name": "Fragaria × ananassa"
  },
  {
    "id": "mint_strong",
    "kind": "variant",
    "profile_id": "mint",
    "variant_id": "mint_strong",
    "cultivar_id": null,
    "name": "sterk mynte",
    "display_name": "sterk mynte",
    "subtitle": "mynte · kraftig vekst",
    "family": "flerårig urt",
    "icon": "🌿",
    "tone": "leafy",
    "ranges": {
      "airTemperature": {
        "optimal": [
          16.0,
          22.0
        ],
        "caution": [
          10.0,
          27.0
        ]
      },
      "airHumidity": {
        "optimal": [
          55.0,
          75.0
        ],
        "caution": [
          45.0,
          85.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          50.0,
          75.0
        ],
        "caution": [
          40.0,
          85.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          14.0,
          20.0
        ],
        "caution": [
          8.0,
          24.0
        ]
      },
      "ph": {
        "optimal": [
          6.0,
          7.0
        ],
        "caution": [
          5.5,
          7.5
        ]
      },
      "lux": {
        "optimal": [
          12000.0,
          30000.0
        ],
        "caution": [
          8000.0,
          35000.0
        ]
      }
    },
    "notes": "Kraftigvoksende mynte; tåler mye klipping, men ikke uttørking.",
    "watering": "Jevnt lett fuktig jord, ikke la potten tørke helt ut.",
    "seed_guide": {
      "sow": "Så inne fra mars-mai.",
      "start": "Startes lyst og jevnt fuktig.",
      "repot": "Pottes om når planten har god rotklump.",
      "plant_out": "Kan stå i drivhus, potte eller varm krok.",
      "harvest": "Høstes jevnlig ved å klippe skudd/topper."
    },
    "category": "urt",
    "latin_name": "Mentha spp."
  },
  {
    "id": "tomato_standard",
    "kind": "variant",
    "profile_id": "tomato",
    "variant_id": "tomato_standard",
    "cultivar_id": null,
    "name": "vanlig tomat",
    "display_name": "vanlig tomat",
    "subtitle": "tomat · middels store frukter",
    "family": "varmeelskende fruktgrønnsak",
    "icon": "🍅",
    "tone": "tomato",
    "ranges": {
      "airTemperature": {
        "optimal": [
          21.0,
          26.0
        ],
        "caution": [
          18.0,
          32.0
        ]
      },
      "airHumidity": {
        "optimal": [
          60.0,
          75.0
        ],
        "caution": [
          50.0,
          85.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          60.0,
          80.0
        ],
        "caution": [
          50.0,
          90.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          18.0,
          22.0
        ],
        "caution": [
          15.0,
          26.0
        ]
      },
      "ph": {
        "optimal": [
          5.8,
          6.8
        ],
        "caution": [
          5.5,
          7.5
        ]
      },
      "lux": {
        "optimal": [
          25000.0,
          60000.0
        ],
        "caution": [
          15000.0,
          70000.0
        ]
      }
    },
    "notes": "Standard tomatprofil; følger baseverdiene uten særlige avvik.",
    "watering": "Jevnt fuktig jord, ikke la tørke helt ut.",
    "seed_guide": {
      "sow": "Så inne i mars-april.",
      "start": "Forkultiveres inne lyst og varmt.",
      "repot": "Pottes om når planten har 2-4 varige blad.",
      "plant_out": "Plantes i drivhus fra mai når nettene er stabile.",
      "harvest": "Høstes vanligvis juli-september."
    },
    "category": "grønnsak",
    "latin_name": "Solanum lycopersicum"
  },
  {
    "id": "cucumber",
    "kind": "base",
    "profile_id": "cucumber",
    "variant_id": null,
    "cultivar_id": null,
    "name": "agurk",
    "display_name": "agurk",
    "subtitle": "varmeelskende fruktgrønnsak",
    "family": "varmeelskende fruktgrønnsak",
    "icon": "🥒",
    "tone": "cucumber",
    "ranges": {
      "airTemperature": {
        "optimal": [
          21.0,
          26.0
        ],
        "caution": [
          18.0,
          32.0
        ]
      },
      "airHumidity": {
        "optimal": [
          60.0,
          75.0
        ],
        "caution": [
          50.0,
          85.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          60.0,
          80.0
        ],
        "caution": [
          50.0,
          90.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          18.0,
          22.0
        ],
        "caution": [
          15.0,
          26.0
        ]
      },
      "ph": {
        "optimal": [
          5.8,
          6.8
        ],
        "caution": [
          5.5,
          7.5
        ]
      },
      "lux": {
        "optimal": [
          25000.0,
          60000.0
        ],
        "caution": [
          15000.0,
          70000.0
        ]
      }
    },
    "notes": "Varm og lyselskende drivhusplante som ikke tåler kulde eller langvarig hete.",
    "watering": "Jevnt fuktig jord, ikke la tørke helt ut.",
    "seed_guide": {
      "sow": "Så inne i april-mai.",
      "start": "Forkultiveres kort inne, helst varmt.",
      "repot": "Pottes forsiktig om uten å forstyrre røttene for mye.",
      "plant_out": "Plantes i drivhus fra mai-juni.",
      "harvest": "Høstes ofte fra juni/juli."
    },
    "category": "grønnsak",
    "latin_name": "Cucumis sativus"
  },
  {
    "id": "borage",
    "kind": "base",
    "profile_id": "borage",
    "variant_id": null,
    "cultivar_id": null,
    "name": "agurkurt",
    "display_name": "agurkurt",
    "subtitle": "ettårig urt/blomst",
    "family": "ettårig urt/blomst",
    "icon": "🥒",
    "tone": "berry",
    "ranges": {
      "airTemperature": {
        "optimal": [
          18.0,
          24.0
        ],
        "caution": [
          10.0,
          28.0
        ]
      },
      "airHumidity": {
        "optimal": [
          50.0,
          70.0
        ],
        "caution": [
          40.0,
          80.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          45.0,
          70.0
        ],
        "caution": [
          35.0,
          80.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          16.0,
          20.0
        ],
        "caution": [
          10.0,
          24.0
        ]
      },
      "ph": {
        "optimal": [
          6.0,
          7.5
        ],
        "caution": [
          5.5,
          7.8
        ]
      },
      "lux": {
        "optimal": [
          20000.0,
          45000.0
        ],
        "caution": [
          15000.0,
          55000.0
        ]
      }
    },
    "notes": "Sommerblomst for drivhus og potter, liker sol, moderat temperatur og god lufting.",
    "watering": "Moderat vanning, unngå både uttørking og klissvåt jord.",
    "seed_guide": {
      "sow": "Start inne vår eller plant som småplante etter behov.",
      "start": "Gi lys, moderat varme og jevn fukt.",
      "repot": "Pottes om når røttene fyller potten.",
      "plant_out": "Settes i drivhus/krukke når veksten er i gang.",
      "harvest": "Følg blomstring/fruktsetting gjennom sesongen."
    },
    "category": "blomst",
    "latin_name": "Borago officinalis"
  },
  {
    "id": "eggplant",
    "kind": "base",
    "profile_id": "eggplant",
    "variant_id": null,
    "cultivar_id": null,
    "name": "aubergine",
    "display_name": "aubergine",
    "subtitle": "varmeelskende fruktgrønnsak",
    "family": "varmeelskende fruktgrønnsak",
    "icon": "🍆",
    "tone": "leafy",
    "ranges": {
      "airTemperature": {
        "optimal": [
          21.0,
          26.0
        ],
        "caution": [
          18.0,
          32.0
        ]
      },
      "airHumidity": {
        "optimal": [
          60.0,
          75.0
        ],
        "caution": [
          50.0,
          85.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          60.0,
          80.0
        ],
        "caution": [
          50.0,
          90.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          18.0,
          22.0
        ],
        "caution": [
          15.0,
          26.0
        ]
      },
      "ph": {
        "optimal": [
          5.8,
          6.8
        ],
        "caution": [
          5.5,
          7.5
        ]
      },
      "lux": {
        "optimal": [
          25000.0,
          60000.0
        ],
        "caution": [
          15000.0,
          70000.0
        ]
      }
    },
    "notes": "Varm og lyselskende drivhusplante som ikke tåler kulde eller langvarig hete.",
    "watering": "Jevnt fuktig jord, ikke la tørke helt ut.",
    "seed_guide": {
      "sow": "Så inne i mars-april.",
      "start": "Forkultiveres inne med varme og godt lys.",
      "repot": "Pottes om når røttene fyller potten.",
      "plant_out": "Flyttes til drivhus fra mai-juni.",
      "harvest": "Høstes når frukt eller blader er modne."
    },
    "category": "grønnsak",
    "latin_name": "Solanum melongena"
  },
  {
    "id": "basil",
    "kind": "base",
    "profile_id": "basil",
    "variant_id": null,
    "cultivar_id": null,
    "name": "basilikum",
    "display_name": "basilikum",
    "subtitle": "varmeelskende urt",
    "family": "varmeelskende urt",
    "icon": "🌿",
    "tone": "basil",
    "ranges": {
      "airTemperature": {
        "optimal": [
          16.0,
          22.0
        ],
        "caution": [
          10.0,
          26.0
        ]
      },
      "airHumidity": {
        "optimal": [
          55.0,
          75.0
        ],
        "caution": [
          45.0,
          85.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          50.0,
          75.0
        ],
        "caution": [
          40.0,
          85.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          14.0,
          20.0
        ],
        "caution": [
          8.0,
          24.0
        ]
      },
      "ph": {
        "optimal": [
          6.0,
          7.0
        ],
        "caution": [
          5.5,
          7.5
        ]
      },
      "lux": {
        "optimal": [
          12000.0,
          30000.0
        ],
        "caution": [
          8000.0,
          35000.0
        ]
      }
    },
    "notes": "Urt som liker moderat varme, god lysmengde og jevnt fuktig jord.",
    "watering": "Jevnt lett fuktig jord, ikke la potten tørke helt ut.",
    "seed_guide": {
      "sow": "Så inne i mars-mai.",
      "start": "Startes inne varmt, lyst og uten trekk.",
      "repot": "Prikles eller pottes om når plantene kan håndteres.",
      "plant_out": "Trives best i drivhus eller varm vinduskarm.",
      "harvest": "Toppes og høstes jevnlig gjennom sesongen."
    },
    "category": "urt",
    "latin_name": "Ocimum basilicum"
  },
  {
    "id": "begonia",
    "kind": "base",
    "profile_id": "begonia",
    "variant_id": null,
    "cultivar_id": null,
    "name": "begonia",
    "display_name": "begonia",
    "subtitle": "skyggetålende blomst",
    "family": "skyggetålende blomst",
    "icon": "🌱",
    "tone": "berry",
    "ranges": {
      "airTemperature": {
        "optimal": [
          18.0,
          24.0
        ],
        "caution": [
          10.0,
          28.0
        ]
      },
      "airHumidity": {
        "optimal": [
          50.0,
          70.0
        ],
        "caution": [
          40.0,
          80.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          45.0,
          70.0
        ],
        "caution": [
          35.0,
          80.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          16.0,
          20.0
        ],
        "caution": [
          10.0,
          24.0
        ]
      },
      "ph": {
        "optimal": [
          6.0,
          7.5
        ],
        "caution": [
          5.5,
          7.8
        ]
      },
      "lux": {
        "optimal": [
          20000.0,
          45000.0
        ],
        "caution": [
          15000.0,
          55000.0
        ]
      }
    },
    "notes": "Sommerblomst for drivhus og potter, liker sol, moderat temperatur og god lufting.",
    "watering": "Moderat vanning, unngå både uttørking og klissvåt jord.",
    "seed_guide": {
      "sow": "Start inne vår eller plant som småplante etter behov.",
      "start": "Gi lys, moderat varme og jevn fukt.",
      "repot": "Pottes om når røttene fyller potten.",
      "plant_out": "Settes i drivhus/krukke når veksten er i gang.",
      "harvest": "Følg blomstring/fruktsetting gjennom sesongen."
    },
    "category": "blomst",
    "latin_name": "Begonia semperflorens"
  },
  {
    "id": "blackberry",
    "kind": "base",
    "profile_id": "blackberry",
    "variant_id": null,
    "cultivar_id": null,
    "name": "bjørnebær",
    "display_name": "bjørnebær",
    "subtitle": "bær busk",
    "family": "bær busk",
    "icon": "🫐",
    "tone": "berry",
    "ranges": {
      "airTemperature": {
        "optimal": [
          16.0,
          22.0
        ],
        "caution": [
          8.0,
          26.0
        ]
      },
      "airHumidity": {
        "optimal": [
          60.0,
          75.0
        ],
        "caution": [
          50.0,
          85.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          55.0,
          75.0
        ],
        "caution": [
          45.0,
          85.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          12.0,
          18.0
        ],
        "caution": [
          8.0,
          22.0
        ]
      },
      "ph": {
        "optimal": [
          5.3,
          6.5
        ],
        "caution": [
          5.0,
          6.8
        ]
      },
      "lux": {
        "optimal": [
          20000.0,
          45000.0
        ],
        "caution": [
          15000.0,
          50000.0
        ]
      }
    },
    "notes": "Bærvekst som liker kjølig til moderat varme, mye lys og jevn jordfukt.",
    "watering": "Jevnt fuktig jord, ikke la potter tørke helt ut.",
    "seed_guide": {
      "sow": "Start inne vår eller plant som småplante etter behov.",
      "start": "Gi lys, moderat varme og jevn fukt.",
      "repot": "Pottes om når røttene fyller potten.",
      "plant_out": "Settes i drivhus/krukke når veksten er i gang.",
      "harvest": "Følg blomstring/fruktsetting gjennom sesongen."
    },
    "category": "bær",
    "latin_name": "Rubus fruticosus"
  },
  {
    "id": "fennel_leaf",
    "kind": "base",
    "profile_id": "fennel_leaf",
    "variant_id": null,
    "cultivar_id": null,
    "name": "bladfennikel",
    "display_name": "bladfennikel",
    "subtitle": "bladurt",
    "family": "bladurt",
    "icon": "🌱",
    "tone": "leafy",
    "ranges": {
      "airTemperature": {
        "optimal": [
          16.0,
          22.0
        ],
        "caution": [
          10.0,
          26.0
        ]
      },
      "airHumidity": {
        "optimal": [
          55.0,
          75.0
        ],
        "caution": [
          45.0,
          85.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          50.0,
          75.0
        ],
        "caution": [
          40.0,
          85.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          14.0,
          20.0
        ],
        "caution": [
          8.0,
          24.0
        ]
      },
      "ph": {
        "optimal": [
          6.0,
          7.0
        ],
        "caution": [
          5.5,
          7.5
        ]
      },
      "lux": {
        "optimal": [
          12000.0,
          30000.0
        ],
        "caution": [
          8000.0,
          35000.0
        ]
      }
    },
    "notes": "Urt som liker moderat varme, god lysmengde og jevnt fuktig jord.",
    "watering": "Jevnt lett fuktig jord, ikke la potten tørke helt ut.",
    "seed_guide": {
      "sow": "Så inne eller direkte fra mars-juli.",
      "start": "Kan forkultiveres for jevnere start.",
      "repot": "Pottes/plantes om når småplantene er robuste.",
      "plant_out": "Trives best i kjølig til mildt drivhusklima.",
      "harvest": "Høstes fortløpende eller når hodet er utviklet."
    },
    "category": "urt",
    "latin_name": "Foeniculum vulgare"
  },
  {
    "id": "nasturtium",
    "kind": "base",
    "profile_id": "nasturtium",
    "variant_id": null,
    "cultivar_id": null,
    "name": "blomkarse",
    "display_name": "blomkarse",
    "subtitle": "ettårig klatre/markdekker",
    "family": "ettårig klatre/markdekker",
    "icon": "🌱",
    "tone": "berry",
    "ranges": {
      "airTemperature": {
        "optimal": [
          18.0,
          24.0
        ],
        "caution": [
          10.0,
          28.0
        ]
      },
      "airHumidity": {
        "optimal": [
          50.0,
          70.0
        ],
        "caution": [
          40.0,
          80.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          45.0,
          70.0
        ],
        "caution": [
          35.0,
          80.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          16.0,
          20.0
        ],
        "caution": [
          10.0,
          24.0
        ]
      },
      "ph": {
        "optimal": [
          6.0,
          7.5
        ],
        "caution": [
          5.5,
          7.8
        ]
      },
      "lux": {
        "optimal": [
          20000.0,
          45000.0
        ],
        "caution": [
          15000.0,
          55000.0
        ]
      }
    },
    "notes": "Sommerblomst for drivhus og potter, liker sol, moderat temperatur og god lufting.",
    "watering": "Moderat vanning, unngå både uttørking og klissvåt jord.",
    "seed_guide": {
      "sow": "Start inne vår eller plant som småplante etter behov.",
      "start": "Gi lys, moderat varme og jevn fukt.",
      "repot": "Pottes om når røttene fyller potten.",
      "plant_out": "Settes i drivhus/krukke når veksten er i gang.",
      "harvest": "Følg blomstring/fruktsetting gjennom sesongen."
    },
    "category": "blomst",
    "latin_name": "Tropaeolum majus"
  },
  {
    "id": "cauliflower",
    "kind": "base",
    "profile_id": "cauliflower",
    "variant_id": null,
    "cultivar_id": null,
    "name": "blomkål",
    "display_name": "blomkål",
    "subtitle": "kålvekst kjølig",
    "family": "kålvekst kjølig",
    "icon": "🥬",
    "tone": "leafy",
    "ranges": {
      "airTemperature": {
        "optimal": [
          14.0,
          20.0
        ],
        "caution": [
          6.0,
          24.0
        ]
      },
      "airHumidity": {
        "optimal": [
          60.0,
          75.0
        ],
        "caution": [
          50.0,
          90.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          55.0,
          75.0
        ],
        "caution": [
          45.0,
          85.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          8.0,
          16.0
        ],
        "caution": [
          4.0,
          20.0
        ]
      },
      "ph": {
        "optimal": [
          6.0,
          7.0
        ],
        "caution": [
          5.5,
          7.5
        ]
      },
      "lux": {
        "optimal": [
          12000.0,
          30000.0
        ],
        "caution": [
          8000.0,
          35000.0
        ]
      }
    },
    "notes": "Kjølig til middels varm bladgrønnsak som liker jevn fukt og stabilt klima.",
    "watering": "Jevnt lett fuktig jord, ikke la den tørke helt ut.",
    "seed_guide": {
      "sow": "Så inne eller direkte fra mars-juli.",
      "start": "Kan forkultiveres for jevnere start.",
      "repot": "Pottes/plantes om når småplantene er robuste.",
      "plant_out": "Trives best i kjølig til mildt drivhusklima.",
      "harvest": "Høstes fortløpende eller når hodet er utviklet."
    },
    "category": "grønnsak",
    "latin_name": "Brassica oleracea var. botrytis"
  },
  {
    "id": "blueberry",
    "kind": "base",
    "profile_id": "blueberry",
    "variant_id": null,
    "cultivar_id": null,
    "name": "blåbær",
    "display_name": "blåbær",
    "subtitle": "bær busk",
    "family": "bær busk",
    "icon": "🫐",
    "tone": "berry",
    "ranges": {
      "airTemperature": {
        "optimal": [
          16.0,
          22.0
        ],
        "caution": [
          8.0,
          26.0
        ]
      },
      "airHumidity": {
        "optimal": [
          60.0,
          75.0
        ],
        "caution": [
          50.0,
          85.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          55.0,
          75.0
        ],
        "caution": [
          45.0,
          85.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          12.0,
          18.0
        ],
        "caution": [
          8.0,
          22.0
        ]
      },
      "ph": {
        "optimal": [
          5.3,
          6.5
        ],
        "caution": [
          5.0,
          6.8
        ]
      },
      "lux": {
        "optimal": [
          20000.0,
          45000.0
        ],
        "caution": [
          15000.0,
          50000.0
        ]
      }
    },
    "notes": "Bærvekst som liker kjølig til moderat varme, mye lys og jevn jordfukt.",
    "watering": "Jevnt fuktig jord, ikke la potter tørke helt ut.",
    "seed_guide": {
      "sow": "Start inne vår eller plant som småplante etter behov.",
      "start": "Gi lys, moderat varme og jevn fukt.",
      "repot": "Pottes om når røttene fyller potten.",
      "plant_out": "Settes i drivhus/krukke når veksten er i gang.",
      "harvest": "Følg blomstring/fruktsetting gjennom sesongen."
    },
    "category": "bær",
    "latin_name": "Vaccinium corymbosum"
  },
  {
    "id": "broad_bean",
    "kind": "base",
    "profile_id": "broad_bean",
    "variant_id": null,
    "cultivar_id": null,
    "name": "bondebønne",
    "display_name": "bondebønne",
    "subtitle": "belgvekst",
    "family": "belgvekst",
    "icon": "🌱",
    "tone": "leafy",
    "ranges": {
      "airTemperature": {
        "optimal": [
          14.0,
          22.0
        ],
        "caution": [
          6.0,
          26.0
        ]
      },
      "airHumidity": {
        "optimal": [
          60.0,
          75.0
        ],
        "caution": [
          50.0,
          85.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          55.0,
          75.0
        ],
        "caution": [
          45.0,
          85.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          10.0,
          18.0
        ],
        "caution": [
          5.0,
          22.0
        ]
      },
      "ph": {
        "optimal": [
          6.0,
          7.5
        ],
        "caution": [
          5.8,
          7.8
        ]
      },
      "lux": {
        "optimal": [
          15000.0,
          30000.0
        ],
        "caution": [
          8000.0,
          35000.0
        ]
      }
    },
    "notes": "Belgvekst som trives i kjølig til moderat temperatur og jevnt fuktig jord.",
    "watering": "Moderat jevn fukt, spesielt i blomstring og belging.",
    "seed_guide": {
      "sow": "Så inne eller direkte fra mars-juli.",
      "start": "Kan forkultiveres for jevnere start.",
      "repot": "Pottes/plantes om når småplantene er robuste.",
      "plant_out": "Trives best i kjølig til mildt drivhusklima.",
      "harvest": "Høstes fortløpende eller når hodet er utviklet."
    },
    "category": "grønnsak",
    "latin_name": "Vicia faba"
  },
  {
    "id": "raspberry",
    "kind": "base",
    "profile_id": "raspberry",
    "variant_id": null,
    "cultivar_id": null,
    "name": "bringebær",
    "display_name": "bringebær",
    "subtitle": "bær busk",
    "family": "bær busk",
    "icon": "🫐",
    "tone": "berry",
    "ranges": {
      "airTemperature": {
        "optimal": [
          16.0,
          22.0
        ],
        "caution": [
          8.0,
          26.0
        ]
      },
      "airHumidity": {
        "optimal": [
          60.0,
          75.0
        ],
        "caution": [
          50.0,
          85.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          55.0,
          75.0
        ],
        "caution": [
          45.0,
          85.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          12.0,
          18.0
        ],
        "caution": [
          8.0,
          22.0
        ]
      },
      "ph": {
        "optimal": [
          5.3,
          6.5
        ],
        "caution": [
          5.0,
          6.8
        ]
      },
      "lux": {
        "optimal": [
          20000.0,
          45000.0
        ],
        "caution": [
          15000.0,
          50000.0
        ]
      }
    },
    "notes": "Bærvekst som liker kjølig til moderat varme, mye lys og jevn jordfukt.",
    "watering": "Jevnt fuktig jord, ikke la potter tørke helt ut.",
    "seed_guide": {
      "sow": "Start inne vår eller plant som småplante etter behov.",
      "start": "Gi lys, moderat varme og jevn fukt.",
      "repot": "Pottes om når røttene fyller potten.",
      "plant_out": "Settes i drivhus/krukke når veksten er i gang.",
      "harvest": "Følg blomstring/fruktsetting gjennom sesongen."
    },
    "category": "bær",
    "latin_name": "Rubus idaeus"
  },
  {
    "id": "broccoli",
    "kind": "base",
    "profile_id": "broccoli",
    "variant_id": null,
    "cultivar_id": null,
    "name": "brokkoli",
    "display_name": "brokkoli",
    "subtitle": "kålvekst kjølig",
    "family": "kålvekst kjølig",
    "icon": "🌱",
    "tone": "leafy",
    "ranges": {
      "airTemperature": {
        "optimal": [
          14.0,
          20.0
        ],
        "caution": [
          6.0,
          24.0
        ]
      },
      "airHumidity": {
        "optimal": [
          60.0,
          75.0
        ],
        "caution": [
          50.0,
          90.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          55.0,
          75.0
        ],
        "caution": [
          45.0,
          85.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          8.0,
          16.0
        ],
        "caution": [
          4.0,
          20.0
        ]
      },
      "ph": {
        "optimal": [
          6.0,
          7.0
        ],
        "caution": [
          5.5,
          7.5
        ]
      },
      "lux": {
        "optimal": [
          12000.0,
          30000.0
        ],
        "caution": [
          8000.0,
          35000.0
        ]
      }
    },
    "notes": "Kjølig til middels varm bladgrønnsak som liker jevn fukt og stabilt klima.",
    "watering": "Jevnt lett fuktig jord, ikke la den tørke helt ut.",
    "seed_guide": {
      "sow": "Så inne eller direkte fra mars-juli.",
      "start": "Kan forkultiveres for jevnere start.",
      "repot": "Pottes/plantes om når småplantene er robuste.",
      "plant_out": "Trives best i kjølig til mildt drivhusklima.",
      "harvest": "Høstes fortløpende eller når hodet er utviklet."
    },
    "category": "grønnsak",
    "latin_name": "Brassica oleracea var. italica"
  },
  {
    "id": "watercress",
    "kind": "base",
    "profile_id": "watercress",
    "variant_id": null,
    "cultivar_id": null,
    "name": "brønnkarse",
    "display_name": "brønnkarse",
    "subtitle": "bladgrønt",
    "family": "bladgrønt",
    "icon": "🌱",
    "tone": "leafy",
    "ranges": {
      "airTemperature": {
        "optimal": [
          16.0,
          22.0
        ],
        "caution": [
          10.0,
          26.0
        ]
      },
      "airHumidity": {
        "optimal": [
          55.0,
          75.0
        ],
        "caution": [
          45.0,
          85.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          50.0,
          75.0
        ],
        "caution": [
          40.0,
          85.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          14.0,
          20.0
        ],
        "caution": [
          8.0,
          24.0
        ]
      },
      "ph": {
        "optimal": [
          6.0,
          7.0
        ],
        "caution": [
          5.5,
          7.5
        ]
      },
      "lux": {
        "optimal": [
          12000.0,
          30000.0
        ],
        "caution": [
          8000.0,
          35000.0
        ]
      }
    },
    "notes": "Urt som liker moderat varme, god lysmengde og jevnt fuktig jord.",
    "watering": "Jevnt lett fuktig jord, ikke la potten tørke helt ut.",
    "seed_guide": {
      "sow": "Så inne eller direkte fra mars-juli.",
      "start": "Kan forkultiveres for jevnere start.",
      "repot": "Pottes/plantes om når småplantene er robuste.",
      "plant_out": "Trives best i kjølig til mildt drivhusklima.",
      "harvest": "Høstes fortløpende eller når hodet er utviklet."
    },
    "category": "grønnsak",
    "latin_name": "Nasturtium officinale"
  },
  {
    "id": "bean",
    "kind": "base",
    "profile_id": "bean",
    "variant_id": null,
    "cultivar_id": null,
    "name": "bønner",
    "display_name": "bønner",
    "subtitle": "belgvekst varm",
    "family": "belgvekst varm",
    "icon": "🌱",
    "tone": "leafy",
    "ranges": {
      "airTemperature": {
        "optimal": [
          14.0,
          22.0
        ],
        "caution": [
          6.0,
          26.0
        ]
      },
      "airHumidity": {
        "optimal": [
          60.0,
          75.0
        ],
        "caution": [
          50.0,
          85.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          55.0,
          75.0
        ],
        "caution": [
          45.0,
          85.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          10.0,
          18.0
        ],
        "caution": [
          5.0,
          22.0
        ]
      },
      "ph": {
        "optimal": [
          6.0,
          7.5
        ],
        "caution": [
          5.8,
          7.8
        ]
      },
      "lux": {
        "optimal": [
          15000.0,
          30000.0
        ],
        "caution": [
          8000.0,
          35000.0
        ]
      }
    },
    "notes": "Belgvekst som trives i kjølig til moderat temperatur og jevnt fuktig jord.",
    "watering": "Moderat jevn fukt, spesielt i blomstring og belging.",
    "seed_guide": {
      "sow": "Så inne eller direkte fra mars-juli.",
      "start": "Kan forkultiveres for jevnere start.",
      "repot": "Pottes/plantes om når småplantene er robuste.",
      "plant_out": "Trives best i kjølig til mildt drivhusklima.",
      "harvest": "Høstes fortløpende eller når hodet er utviklet."
    },
    "category": "grønnsak",
    "latin_name": "Phaseolus vulgaris"
  },
  {
    "id": "chili",
    "kind": "base",
    "profile_id": "chili",
    "variant_id": null,
    "cultivar_id": null,
    "name": "chili",
    "display_name": "chili",
    "subtitle": "varmeelskende chili",
    "family": "varmeelskende chili",
    "icon": "🌶️",
    "tone": "pepper",
    "ranges": {
      "airTemperature": {
        "optimal": [
          21.0,
          26.0
        ],
        "caution": [
          18.0,
          32.0
        ]
      },
      "airHumidity": {
        "optimal": [
          60.0,
          75.0
        ],
        "caution": [
          50.0,
          85.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          60.0,
          80.0
        ],
        "caution": [
          50.0,
          90.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          18.0,
          22.0
        ],
        "caution": [
          15.0,
          26.0
        ]
      },
      "ph": {
        "optimal": [
          5.8,
          6.8
        ],
        "caution": [
          5.5,
          7.5
        ]
      },
      "lux": {
        "optimal": [
          25000.0,
          60000.0
        ],
        "caution": [
          15000.0,
          70000.0
        ]
      }
    },
    "notes": "Varm og lyselskende drivhusplante som ikke tåler kulde eller langvarig hete.",
    "watering": "Jevnt fuktig jord, ikke la tørke helt ut.",
    "seed_guide": {
      "sow": "Så inne i januar-mars.",
      "start": "Startes inne tidlig med varme og mye lys.",
      "repot": "Pottes om gradvis for sterk rotvekst.",
      "plant_out": "Settes i drivhus når temperaturen holder seg stabil.",
      "harvest": "Høstes fra sensommeren og utover."
    },
    "category": "grønnsak",
    "latin_name": "Capsicum annuum"
  },
  {
    "id": "dill",
    "kind": "base",
    "profile_id": "dill",
    "variant_id": null,
    "cultivar_id": null,
    "name": "dill",
    "display_name": "dill",
    "subtitle": "ettårig urt",
    "family": "ettårig urt",
    "icon": "🌿",
    "tone": "leafy",
    "ranges": {
      "airTemperature": {
        "optimal": [
          16.0,
          22.0
        ],
        "caution": [
          10.0,
          26.0
        ]
      },
      "airHumidity": {
        "optimal": [
          55.0,
          75.0
        ],
        "caution": [
          45.0,
          85.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          50.0,
          75.0
        ],
        "caution": [
          40.0,
          85.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          14.0,
          20.0
        ],
        "caution": [
          8.0,
          24.0
        ]
      },
      "ph": {
        "optimal": [
          6.0,
          7.0
        ],
        "caution": [
          5.5,
          7.5
        ]
      },
      "lux": {
        "optimal": [
          12000.0,
          30000.0
        ],
        "caution": [
          8000.0,
          35000.0
        ]
      }
    },
    "notes": "Urt som liker moderat varme, god lysmengde og jevnt fuktig jord.",
    "watering": "Jevnt lett fuktig jord, ikke la potten tørke helt ut.",
    "seed_guide": {
      "sow": "Så inne fra mars-mai.",
      "start": "Startes lyst og jevnt fuktig.",
      "repot": "Pottes om når planten har god rotklump.",
      "plant_out": "Kan stå i drivhus, potte eller varm krok.",
      "harvest": "Høstes jevnlig ved å klippe skudd/topper."
    },
    "category": "urt",
    "latin_name": "Anethum graveolens"
  },
  {
    "id": "grape",
    "kind": "base",
    "profile_id": "grape",
    "variant_id": null,
    "cultivar_id": null,
    "name": "drue",
    "display_name": "drue",
    "subtitle": "klatrende frukt",
    "family": "klatrende frukt",
    "icon": "🍇",
    "tone": "berry",
    "ranges": {
      "airTemperature": {
        "optimal": [
          21.0,
          26.0
        ],
        "caution": [
          18.0,
          32.0
        ]
      },
      "airHumidity": {
        "optimal": [
          60.0,
          75.0
        ],
        "caution": [
          50.0,
          85.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          60.0,
          80.0
        ],
        "caution": [
          50.0,
          90.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          18.0,
          22.0
        ],
        "caution": [
          15.0,
          26.0
        ]
      },
      "ph": {
        "optimal": [
          5.8,
          6.8
        ],
        "caution": [
          5.5,
          7.5
        ]
      },
      "lux": {
        "optimal": [
          25000.0,
          60000.0
        ],
        "caution": [
          15000.0,
          70000.0
        ]
      }
    },
    "notes": "Varm og lyselskende drivhusplante som ikke tåler kulde eller langvarig hete.",
    "watering": "Jevnt fuktig jord, ikke la tørke helt ut.",
    "seed_guide": {
      "sow": "Start inne vår eller plant som småplante etter behov.",
      "start": "Gi lys, moderat varme og jevn fukt.",
      "repot": "Pottes om når røttene fyller potten.",
      "plant_out": "Settes i drivhus/krukke når veksten er i gang.",
      "harvest": "Følg blomstring/fruktsetting gjennom sesongen."
    },
    "category": "frukt",
    "latin_name": "Vitis vinifera"
  },
  {
    "id": "endive",
    "kind": "base",
    "profile_id": "endive",
    "variant_id": null,
    "cultivar_id": null,
    "name": "endive",
    "display_name": "endive",
    "subtitle": "bladgrønt",
    "family": "bladgrønt",
    "icon": "🌱",
    "tone": "leafy",
    "ranges": {
      "airTemperature": {
        "optimal": [
          14.0,
          20.0
        ],
        "caution": [
          6.0,
          24.0
        ]
      },
      "airHumidity": {
        "optimal": [
          60.0,
          75.0
        ],
        "caution": [
          50.0,
          90.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          55.0,
          75.0
        ],
        "caution": [
          45.0,
          85.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          8.0,
          16.0
        ],
        "caution": [
          4.0,
          20.0
        ]
      },
      "ph": {
        "optimal": [
          6.0,
          7.0
        ],
        "caution": [
          5.5,
          7.5
        ]
      },
      "lux": {
        "optimal": [
          12000.0,
          30000.0
        ],
        "caution": [
          8000.0,
          35000.0
        ]
      }
    },
    "notes": "Kjølig til middels varm bladgrønnsak som liker jevn fukt og stabilt klima.",
    "watering": "Jevnt lett fuktig jord, ikke la den tørke helt ut.",
    "seed_guide": {
      "sow": "Så inne eller direkte fra mars-juli.",
      "start": "Kan forkultiveres for jevnere start.",
      "repot": "Pottes/plantes om når småplantene er robuste.",
      "plant_out": "Trives best i kjølig til mildt drivhusklima.",
      "harvest": "Høstes fortløpende eller når hodet er utviklet."
    },
    "category": "grønnsak",
    "latin_name": "Cichorium endivia"
  },
  {
    "id": "sweet_pea",
    "kind": "base",
    "profile_id": "sweet_pea",
    "variant_id": null,
    "cultivar_id": null,
    "name": "erteblomst",
    "display_name": "erteblomst",
    "subtitle": "klatreblomst",
    "family": "klatreblomst",
    "icon": "🌸",
    "tone": "berry",
    "ranges": {
      "airTemperature": {
        "optimal": [
          18.0,
          24.0
        ],
        "caution": [
          10.0,
          28.0
        ]
      },
      "airHumidity": {
        "optimal": [
          50.0,
          70.0
        ],
        "caution": [
          40.0,
          80.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          45.0,
          70.0
        ],
        "caution": [
          35.0,
          80.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          16.0,
          20.0
        ],
        "caution": [
          10.0,
          24.0
        ]
      },
      "ph": {
        "optimal": [
          6.0,
          7.5
        ],
        "caution": [
          5.5,
          7.8
        ]
      },
      "lux": {
        "optimal": [
          20000.0,
          45000.0
        ],
        "caution": [
          15000.0,
          55000.0
        ]
      }
    },
    "notes": "Sommerblomst for drivhus og potter, liker sol, moderat temperatur og god lufting.",
    "watering": "Moderat vanning, unngå både uttørking og klissvåt jord.",
    "seed_guide": {
      "sow": "Start inne vår eller plant som småplante etter behov.",
      "start": "Gi lys, moderat varme og jevn fukt.",
      "repot": "Pottes om når røttene fyller potten.",
      "plant_out": "Settes i drivhus/krukke når veksten er i gang.",
      "harvest": "Følg blomstring/fruktsetting gjennom sesongen."
    },
    "category": "blomst",
    "latin_name": "Lathyrus odoratus"
  },
  {
    "id": "tarragon",
    "kind": "base",
    "profile_id": "tarragon",
    "variant_id": null,
    "cultivar_id": null,
    "name": "estragon",
    "display_name": "estragon",
    "subtitle": "bladurt",
    "family": "bladurt",
    "icon": "🌱",
    "tone": "leafy",
    "ranges": {
      "airTemperature": {
        "optimal": [
          16.0,
          22.0
        ],
        "caution": [
          10.0,
          26.0
        ]
      },
      "airHumidity": {
        "optimal": [
          55.0,
          75.0
        ],
        "caution": [
          45.0,
          85.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          50.0,
          75.0
        ],
        "caution": [
          40.0,
          85.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          14.0,
          20.0
        ],
        "caution": [
          8.0,
          24.0
        ]
      },
      "ph": {
        "optimal": [
          6.0,
          7.0
        ],
        "caution": [
          5.5,
          7.5
        ]
      },
      "lux": {
        "optimal": [
          12000.0,
          30000.0
        ],
        "caution": [
          8000.0,
          35000.0
        ]
      }
    },
    "notes": "Urt som liker moderat varme, god lysmengde og jevnt fuktig jord.",
    "watering": "Jevnt lett fuktig jord, ikke la potten tørke helt ut.",
    "seed_guide": {
      "sow": "Så inne eller direkte fra mars-juli.",
      "start": "Kan forkultiveres for jevnere start.",
      "repot": "Pottes/plantes om når småplantene er robuste.",
      "plant_out": "Trives best i kjølig til mildt drivhusklima.",
      "harvest": "Høstes fortløpende eller når hodet er utviklet."
    },
    "category": "urt",
    "latin_name": "Artemisia dracunculus"
  },
  {
    "id": "lambs_lettuce",
    "kind": "base",
    "profile_id": "lambs_lettuce",
    "variant_id": null,
    "cultivar_id": null,
    "name": "feltsalat",
    "display_name": "feltsalat",
    "subtitle": "bladgrønt",
    "family": "bladgrønt",
    "icon": "🥬",
    "tone": "leafy",
    "ranges": {
      "airTemperature": {
        "optimal": [
          14.0,
          20.0
        ],
        "caution": [
          6.0,
          24.0
        ]
      },
      "airHumidity": {
        "optimal": [
          60.0,
          75.0
        ],
        "caution": [
          50.0,
          90.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          55.0,
          75.0
        ],
        "caution": [
          45.0,
          85.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          8.0,
          16.0
        ],
        "caution": [
          4.0,
          20.0
        ]
      },
      "ph": {
        "optimal": [
          6.0,
          7.0
        ],
        "caution": [
          5.5,
          7.5
        ]
      },
      "lux": {
        "optimal": [
          12000.0,
          30000.0
        ],
        "caution": [
          8000.0,
          35000.0
        ]
      }
    },
    "notes": "Kjølig til middels varm bladgrønnsak som liker jevn fukt og stabilt klima.",
    "watering": "Jevnt lett fuktig jord, ikke la den tørke helt ut.",
    "seed_guide": {
      "sow": "Så inne eller direkte fra mars-juli.",
      "start": "Kan forkultiveres for jevnere start.",
      "repot": "Pottes/plantes om når småplantene er robuste.",
      "plant_out": "Trives best i kjølig til mildt drivhusklima.",
      "harvest": "Høstes fortløpende eller når hodet er utviklet."
    },
    "category": "grønnsak",
    "latin_name": "Valerianella locusta"
  },
  {
    "id": "fig",
    "kind": "base",
    "profile_id": "fig",
    "variant_id": null,
    "cultivar_id": null,
    "name": "fiken",
    "display_name": "fiken",
    "subtitle": "middelhavsfrukt",
    "family": "middelhavsfrukt",
    "icon": "🪴",
    "tone": "berry",
    "ranges": {
      "airTemperature": {
        "optimal": [
          21.0,
          26.0
        ],
        "caution": [
          18.0,
          32.0
        ]
      },
      "airHumidity": {
        "optimal": [
          60.0,
          75.0
        ],
        "caution": [
          50.0,
          85.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          60.0,
          80.0
        ],
        "caution": [
          50.0,
          90.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          18.0,
          22.0
        ],
        "caution": [
          15.0,
          26.0
        ]
      },
      "ph": {
        "optimal": [
          5.8,
          6.8
        ],
        "caution": [
          5.5,
          7.5
        ]
      },
      "lux": {
        "optimal": [
          25000.0,
          60000.0
        ],
        "caution": [
          15000.0,
          70000.0
        ]
      }
    },
    "notes": "Varm og lyselskende drivhusplante som ikke tåler kulde eller langvarig hete.",
    "watering": "Jevnt fuktig jord, ikke la tørke helt ut.",
    "seed_guide": {
      "sow": "Start inne vår eller plant som småplante etter behov.",
      "start": "Gi lys, moderat varme og jevn fukt.",
      "repot": "Pottes om når røttene fyller potten.",
      "plant_out": "Settes i drivhus/krukke når veksten er i gang.",
      "harvest": "Følg blomstring/fruktsetting gjennom sesongen."
    },
    "category": "frukt",
    "latin_name": "Ficus carica"
  },
  {
    "id": "impatiens",
    "kind": "base",
    "profile_id": "impatiens",
    "variant_id": null,
    "cultivar_id": null,
    "name": "flittig lise",
    "display_name": "flittig lise",
    "subtitle": "skyggetålende blomst",
    "family": "skyggetålende blomst",
    "icon": "🌱",
    "tone": "berry",
    "ranges": {
      "airTemperature": {
        "optimal": [
          18.0,
          24.0
        ],
        "caution": [
          10.0,
          28.0
        ]
      },
      "airHumidity": {
        "optimal": [
          50.0,
          70.0
        ],
        "caution": [
          40.0,
          80.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          45.0,
          70.0
        ],
        "caution": [
          35.0,
          80.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          16.0,
          20.0
        ],
        "caution": [
          10.0,
          24.0
        ]
      },
      "ph": {
        "optimal": [
          6.0,
          7.5
        ],
        "caution": [
          5.5,
          7.8
        ]
      },
      "lux": {
        "optimal": [
          20000.0,
          45000.0
        ],
        "caution": [
          15000.0,
          55000.0
        ]
      }
    },
    "notes": "Sommerblomst for drivhus og potter, liker sol, moderat temperatur og god lufting.",
    "watering": "Moderat vanning, unngå både uttørking og klissvåt jord.",
    "seed_guide": {
      "sow": "Start inne vår eller plant som småplante etter behov.",
      "start": "Gi lys, moderat varme og jevn fukt.",
      "repot": "Pottes om når røttene fyller potten.",
      "plant_out": "Settes i drivhus/krukke når veksten er i gang.",
      "harvest": "Følg blomstring/fruktsetting gjennom sesongen."
    },
    "category": "blomst",
    "latin_name": "Impatiens walleriana"
  },
  {
    "id": "fuchsia",
    "kind": "base",
    "profile_id": "fuchsia",
    "variant_id": null,
    "cultivar_id": null,
    "name": "fuchsia",
    "display_name": "fuchsia",
    "subtitle": "ampel/krukke",
    "family": "ampel/krukke",
    "icon": "🌱",
    "tone": "berry",
    "ranges": {
      "airTemperature": {
        "optimal": [
          18.0,
          24.0
        ],
        "caution": [
          10.0,
          28.0
        ]
      },
      "airHumidity": {
        "optimal": [
          50.0,
          70.0
        ],
        "caution": [
          40.0,
          80.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          45.0,
          70.0
        ],
        "caution": [
          35.0,
          80.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          16.0,
          20.0
        ],
        "caution": [
          10.0,
          24.0
        ]
      },
      "ph": {
        "optimal": [
          6.0,
          7.5
        ],
        "caution": [
          5.5,
          7.8
        ]
      },
      "lux": {
        "optimal": [
          20000.0,
          45000.0
        ],
        "caution": [
          15000.0,
          55000.0
        ]
      }
    },
    "notes": "Sommerblomst for drivhus og potter, liker sol, moderat temperatur og god lufting.",
    "watering": "Moderat vanning, unngå både uttørking og klissvåt jord.",
    "seed_guide": {
      "sow": "Start inne vår eller plant som småplante etter behov.",
      "start": "Gi lys, moderat varme og jevn fukt.",
      "repot": "Pottes om når røttene fyller potten.",
      "plant_out": "Settes i drivhus/krukke når veksten er i gang.",
      "harvest": "Følg blomstring/fruktsetting gjennom sesongen."
    },
    "category": "blomst",
    "latin_name": "Fuchsia hybrida"
  },
  {
    "id": "pumpkin",
    "kind": "base",
    "profile_id": "pumpkin",
    "variant_id": null,
    "cultivar_id": null,
    "name": "gresskar",
    "display_name": "gresskar",
    "subtitle": "varmeelskende fruktgrønnsak",
    "family": "varmeelskende fruktgrønnsak",
    "icon": "🎃",
    "tone": "leafy",
    "ranges": {
      "airTemperature": {
        "optimal": [
          21.0,
          26.0
        ],
        "caution": [
          18.0,
          32.0
        ]
      },
      "airHumidity": {
        "optimal": [
          60.0,
          75.0
        ],
        "caution": [
          50.0,
          85.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          60.0,
          80.0
        ],
        "caution": [
          50.0,
          90.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          18.0,
          22.0
        ],
        "caution": [
          15.0,
          26.0
        ]
      },
      "ph": {
        "optimal": [
          5.8,
          6.8
        ],
        "caution": [
          5.5,
          7.5
        ]
      },
      "lux": {
        "optimal": [
          25000.0,
          60000.0
        ],
        "caution": [
          15000.0,
          70000.0
        ]
      }
    },
    "notes": "Varm og lyselskende drivhusplante som ikke tåler kulde eller langvarig hete.",
    "watering": "Jevnt fuktig jord, ikke la tørke helt ut.",
    "seed_guide": {
      "sow": "Så inne i mars-april.",
      "start": "Forkultiveres inne med varme og godt lys.",
      "repot": "Pottes om når røttene fyller potten.",
      "plant_out": "Flyttes til drivhus fra mai-juni.",
      "harvest": "Høstes når frukt eller blader er modne."
    },
    "category": "grønnsak",
    "latin_name": "Cucurbita maxima"
  },
  {
    "id": "chives",
    "kind": "base",
    "profile_id": "chives",
    "variant_id": null,
    "cultivar_id": null,
    "name": "gressløk",
    "display_name": "gressløk",
    "subtitle": "flerårig urt",
    "family": "flerårig urt",
    "icon": "🌿",
    "tone": "leafy",
    "ranges": {
      "airTemperature": {
        "optimal": [
          14.0,
          22.0
        ],
        "caution": [
          4.0,
          26.0
        ]
      },
      "airHumidity": {
        "optimal": [
          60.0,
          75.0
        ],
        "caution": [
          50.0,
          85.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          50.0,
          70.0
        ],
        "caution": [
          40.0,
          80.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          8.0,
          18.0
        ],
        "caution": [
          4.0,
          22.0
        ]
      },
      "ph": {
        "optimal": [
          6.0,
          7.0
        ],
        "caution": [
          5.5,
          7.8
        ]
      },
      "lux": {
        "optimal": [
          15000.0,
          30000.0
        ],
        "caution": [
          8000.0,
          35000.0
        ]
      }
    },
    "notes": "Kjølig til mild løkvekst som liker veldrenert jord og moderat fukt.",
    "watering": "Moderat fukt, la jorden tørke lett mellom vanning.",
    "seed_guide": {
      "sow": "Så inne fra mars-mai.",
      "start": "Startes lyst og jevnt fuktig.",
      "repot": "Pottes om når planten har god rotklump.",
      "plant_out": "Kan stå i drivhus, potte eller varm krok.",
      "harvest": "Høstes jevnlig ved å klippe skudd/topper."
    },
    "category": "urt",
    "latin_name": "Allium schoenoprasum"
  },
  {
    "id": "kale",
    "kind": "base",
    "profile_id": "kale",
    "variant_id": null,
    "cultivar_id": null,
    "name": "grønnkål",
    "display_name": "grønnkål",
    "subtitle": "kålvekst kjølig",
    "family": "kålvekst kjølig",
    "icon": "🥬",
    "tone": "leafy",
    "ranges": {
      "airTemperature": {
        "optimal": [
          14.0,
          20.0
        ],
        "caution": [
          6.0,
          24.0
        ]
      },
      "airHumidity": {
        "optimal": [
          60.0,
          75.0
        ],
        "caution": [
          50.0,
          90.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          55.0,
          75.0
        ],
        "caution": [
          45.0,
          85.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          8.0,
          16.0
        ],
        "caution": [
          4.0,
          20.0
        ]
      },
      "ph": {
        "optimal": [
          6.0,
          7.0
        ],
        "caution": [
          5.5,
          7.5
        ]
      },
      "lux": {
        "optimal": [
          12000.0,
          30000.0
        ],
        "caution": [
          8000.0,
          35000.0
        ]
      }
    },
    "notes": "Kjølig til middels varm bladgrønnsak som liker jevn fukt og stabilt klima.",
    "watering": "Jevnt lett fuktig jord, ikke la den tørke helt ut.",
    "seed_guide": {
      "sow": "Så inne eller direkte fra mars-juli.",
      "start": "Kan forkultiveres for jevnere start.",
      "repot": "Pottes/plantes om når småplantene er robuste.",
      "plant_out": "Trives best i kjølig til mildt drivhusklima.",
      "harvest": "Høstes fortløpende eller når hodet er utviklet."
    },
    "category": "grønnsak",
    "latin_name": "Brassica oleracea var. sabellica"
  },
  {
    "id": "carrot",
    "kind": "base",
    "profile_id": "carrot",
    "variant_id": null,
    "cultivar_id": null,
    "name": "gulrot",
    "display_name": "gulrot",
    "subtitle": "rotgrønnsak",
    "family": "rotgrønnsak",
    "icon": "🥕",
    "tone": "leafy",
    "ranges": {
      "airTemperature": {
        "optimal": [
          12.0,
          20.0
        ],
        "caution": [
          6.0,
          24.0
        ]
      },
      "airHumidity": {
        "optimal": [
          60.0,
          75.0
        ],
        "caution": [
          50.0,
          90.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          50.0,
          70.0
        ],
        "caution": [
          40.0,
          80.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          8.0,
          18.0
        ],
        "caution": [
          4.0,
          22.0
        ]
      },
      "ph": {
        "optimal": [
          6.0,
          7.0
        ],
        "caution": [
          5.5,
          7.5
        ]
      },
      "lux": {
        "optimal": [
          12000.0,
          30000.0
        ],
        "caution": [
          8000.0,
          35000.0
        ]
      }
    },
    "notes": "Kjølig til middels varm rotvekst som liker dyp, løs jord og jevn fukt.",
    "watering": "Moderat jevn fukt, ikke vannmettet jord.",
    "seed_guide": {
      "sow": "Så direkte fra april-juni.",
      "start": "Forkultivering er sjelden nødvendig.",
      "repot": "Unngå mye ompotting, røtter liker ro.",
      "plant_out": "Dyrkes direkte i dyp og løs jord.",
      "harvest": "Høstes når røttene har ønsket størrelse."
    },
    "category": "grønnsak",
    "latin_name": "Daucus carota"
  },
  {
    "id": "pea_garden",
    "kind": "base",
    "profile_id": "pea_garden",
    "variant_id": null,
    "cultivar_id": null,
    "name": "hageert",
    "display_name": "hageert",
    "subtitle": "belgvekst",
    "family": "belgvekst",
    "icon": "🌱",
    "tone": "leafy",
    "ranges": {
      "airTemperature": {
        "optimal": [
          14.0,
          22.0
        ],
        "caution": [
          6.0,
          26.0
        ]
      },
      "airHumidity": {
        "optimal": [
          60.0,
          75.0
        ],
        "caution": [
          50.0,
          85.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          55.0,
          75.0
        ],
        "caution": [
          45.0,
          85.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          10.0,
          18.0
        ],
        "caution": [
          5.0,
          22.0
        ]
      },
      "ph": {
        "optimal": [
          6.0,
          7.5
        ],
        "caution": [
          5.8,
          7.8
        ]
      },
      "lux": {
        "optimal": [
          15000.0,
          30000.0
        ],
        "caution": [
          8000.0,
          35000.0
        ]
      }
    },
    "notes": "Belgvekst som trives i kjølig til moderat temperatur og jevnt fuktig jord.",
    "watering": "Moderat jevn fukt, spesielt i blomstring og belging.",
    "seed_guide": {
      "sow": "Så inne eller direkte fra mars-juli.",
      "start": "Kan forkultiveres for jevnere start.",
      "repot": "Pottes/plantes om når småplantene er robuste.",
      "plant_out": "Trives best i kjølig til mildt drivhusklima.",
      "harvest": "Høstes fortløpende eller når hodet er utviklet."
    },
    "category": "grønnsak",
    "latin_name": "Pisum sativum"
  },
  {
    "id": "garlic",
    "kind": "base",
    "profile_id": "garlic",
    "variant_id": null,
    "cultivar_id": null,
    "name": "hvitløk",
    "display_name": "hvitløk",
    "subtitle": "løkvekst",
    "family": "løkvekst",
    "icon": "🧄",
    "tone": "leafy",
    "ranges": {
      "airTemperature": {
        "optimal": [
          14.0,
          22.0
        ],
        "caution": [
          4.0,
          26.0
        ]
      },
      "airHumidity": {
        "optimal": [
          60.0,
          75.0
        ],
        "caution": [
          50.0,
          85.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          50.0,
          70.0
        ],
        "caution": [
          40.0,
          80.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          8.0,
          18.0
        ],
        "caution": [
          4.0,
          22.0
        ]
      },
      "ph": {
        "optimal": [
          6.0,
          7.0
        ],
        "caution": [
          5.5,
          7.8
        ]
      },
      "lux": {
        "optimal": [
          15000.0,
          30000.0
        ],
        "caution": [
          8000.0,
          35000.0
        ]
      }
    },
    "notes": "Kjølig til mild løkvekst som liker veldrenert jord og moderat fukt.",
    "watering": "Moderat fukt, la jorden tørke lett mellom vanning.",
    "seed_guide": {
      "sow": "Så inne eller direkte fra mars-juli.",
      "start": "Kan forkultiveres for jevnere start.",
      "repot": "Pottes/plantes om når småplantene er robuste.",
      "plant_out": "Trives best i kjølig til mildt drivhusklima.",
      "harvest": "Høstes fortløpende eller når hodet er utviklet."
    },
    "category": "grønnsak",
    "latin_name": "Allium sativum"
  },
  {
    "id": "strawberry",
    "kind": "base",
    "profile_id": "strawberry",
    "variant_id": null,
    "cultivar_id": null,
    "name": "jordbær",
    "display_name": "jordbær",
    "subtitle": "bær flerårig",
    "family": "bær flerårig",
    "icon": "🍓",
    "tone": "berry",
    "ranges": {
      "airTemperature": {
        "optimal": [
          16.0,
          22.0
        ],
        "caution": [
          8.0,
          26.0
        ]
      },
      "airHumidity": {
        "optimal": [
          60.0,
          75.0
        ],
        "caution": [
          50.0,
          85.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          55.0,
          75.0
        ],
        "caution": [
          45.0,
          85.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          12.0,
          18.0
        ],
        "caution": [
          8.0,
          22.0
        ]
      },
      "ph": {
        "optimal": [
          5.3,
          6.5
        ],
        "caution": [
          5.0,
          6.8
        ]
      },
      "lux": {
        "optimal": [
          20000.0,
          45000.0
        ],
        "caution": [
          15000.0,
          50000.0
        ]
      }
    },
    "notes": "Bærvekst som liker kjølig til moderat varme, mye lys og jevn jordfukt.",
    "watering": "Jevnt fuktig jord, ikke la potter tørke helt ut.",
    "seed_guide": {
      "sow": "Plantes vanligvis som småplanter vår eller sensommer.",
      "start": "Kan stå i potter/kasser i drivhus.",
      "repot": "Pottes om ved tett rotklump eller før ny sesong.",
      "plant_out": "Settes ut eller i drivhus når faren for hard frost er over.",
      "harvest": "Bærer vanligvis fra juni, remonterende sorter lengre."
    },
    "category": "bær",
    "latin_name": "Fragaria × ananassa"
  },
  {
    "id": "strawberry_spinach",
    "kind": "base",
    "profile_id": "strawberry_spinach",
    "variant_id": null,
    "cultivar_id": null,
    "name": "jordbærspinat",
    "display_name": "jordbærspinat",
    "subtitle": "bladgrønt med spiselige bær",
    "family": "bladgrønt med spiselige bær",
    "icon": "🫐",
    "tone": "leafy",
    "ranges": {
      "airTemperature": {
        "optimal": [
          14.0,
          22.0
        ],
        "caution": [
          6.0,
          26.0
        ]
      },
      "airHumidity": {
        "optimal": [
          55.0,
          75.0
        ],
        "caution": [
          45.0,
          85.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          55.0,
          75.0
        ],
        "caution": [
          45.0,
          85.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          10.0,
          18.0
        ],
        "caution": [
          5.0,
          22.0
        ]
      },
      "ph": {
        "optimal": [
          6.0,
          7.2
        ],
        "caution": [
          5.8,
          7.8
        ]
      },
      "lux": {
        "optimal": [
          15000.0,
          35000.0
        ],
        "caution": [
          8000.0,
          45000.0
        ]
      }
    },
    "notes": "Ettårig bladgrønt med dekorative røde bær. Trives i sol til halvskygge og kjølig til mildt klima.",
    "watering": "Jevnt lett fuktig jord, men ikke klissvåt.",
    "seed_guide": {
      "sow": "Så inne eller direkte fra mars-juli.",
      "start": "Kan forkultiveres for jevnere start.",
      "repot": "Pottes/plantes om når småplantene er robuste.",
      "plant_out": "Trives best i kjølig til mildt drivhusklima.",
      "harvest": "Høstes fortløpende eller når hodet er utviklet."
    },
    "category": "grønnsak",
    "latin_name": "Blitum capitatum"
  },
  {
    "id": "chamomile",
    "kind": "base",
    "profile_id": "chamomile",
    "variant_id": null,
    "cultivar_id": null,
    "name": "kamille",
    "display_name": "kamille",
    "subtitle": "blomst/urt",
    "family": "blomst/urt",
    "icon": "🌱",
    "tone": "leafy",
    "ranges": {
      "airTemperature": {
        "optimal": [
          16.0,
          22.0
        ],
        "caution": [
          10.0,
          26.0
        ]
      },
      "airHumidity": {
        "optimal": [
          55.0,
          75.0
        ],
        "caution": [
          45.0,
          85.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          50.0,
          75.0
        ],
        "caution": [
          40.0,
          85.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          14.0,
          20.0
        ],
        "caution": [
          8.0,
          24.0
        ]
      },
      "ph": {
        "optimal": [
          6.0,
          7.0
        ],
        "caution": [
          5.5,
          7.5
        ]
      },
      "lux": {
        "optimal": [
          12000.0,
          30000.0
        ],
        "caution": [
          8000.0,
          35000.0
        ]
      }
    },
    "notes": "Urt som liker moderat varme, god lysmengde og jevnt fuktig jord.",
    "watering": "Jevnt lett fuktig jord, ikke la potten tørke helt ut.",
    "seed_guide": {
      "sow": "Så inne fra mars-mai.",
      "start": "Startes lyst og jevnt fuktig.",
      "repot": "Pottes om når planten har god rotklump.",
      "plant_out": "Kan stå i drivhus, potte eller varm krok.",
      "harvest": "Høstes jevnlig ved å klippe skudd/topper."
    },
    "category": "urt",
    "latin_name": "Matricaria chamomilla"
  },
  {
    "id": "chinese_cabbage",
    "kind": "base",
    "profile_id": "chinese_cabbage",
    "variant_id": null,
    "cultivar_id": null,
    "name": "kinakål",
    "display_name": "kinakål",
    "subtitle": "kålvekst bladgrønt",
    "family": "kålvekst bladgrønt",
    "icon": "🥬",
    "tone": "leafy",
    "ranges": {
      "airTemperature": {
        "optimal": [
          14.0,
          20.0
        ],
        "caution": [
          6.0,
          24.0
        ]
      },
      "airHumidity": {
        "optimal": [
          60.0,
          75.0
        ],
        "caution": [
          50.0,
          90.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          55.0,
          75.0
        ],
        "caution": [
          45.0,
          85.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          8.0,
          16.0
        ],
        "caution": [
          4.0,
          20.0
        ]
      },
      "ph": {
        "optimal": [
          6.0,
          7.0
        ],
        "caution": [
          5.5,
          7.5
        ]
      },
      "lux": {
        "optimal": [
          12000.0,
          30000.0
        ],
        "caution": [
          8000.0,
          35000.0
        ]
      }
    },
    "notes": "Kjølig til middels varm bladgrønnsak som liker jevn fukt og stabilt klima.",
    "watering": "Jevnt lett fuktig jord, ikke la den tørke helt ut.",
    "seed_guide": {
      "sow": "Så inne eller direkte fra mars-juli.",
      "start": "Kan forkultiveres for jevnere start.",
      "repot": "Pottes/plantes om når småplantene er robuste.",
      "plant_out": "Trives best i kjølig til mildt drivhusklima.",
      "harvest": "Høstes fortløpende eller når hodet er utviklet."
    },
    "category": "grønnsak",
    "latin_name": "Brassica rapa subsp. pekinensis"
  },
  {
    "id": "chervil",
    "kind": "base",
    "profile_id": "chervil",
    "variant_id": null,
    "cultivar_id": null,
    "name": "kjørvel",
    "display_name": "kjørvel",
    "subtitle": "bladurt",
    "family": "bladurt",
    "icon": "🌱",
    "tone": "leafy",
    "ranges": {
      "airTemperature": {
        "optimal": [
          16.0,
          22.0
        ],
        "caution": [
          10.0,
          26.0
        ]
      },
      "airHumidity": {
        "optimal": [
          55.0,
          75.0
        ],
        "caution": [
          45.0,
          85.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          50.0,
          75.0
        ],
        "caution": [
          40.0,
          85.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          14.0,
          20.0
        ],
        "caution": [
          8.0,
          24.0
        ]
      },
      "ph": {
        "optimal": [
          6.0,
          7.0
        ],
        "caution": [
          5.5,
          7.5
        ]
      },
      "lux": {
        "optimal": [
          12000.0,
          30000.0
        ],
        "caution": [
          8000.0,
          35000.0
        ]
      }
    },
    "notes": "Urt som liker moderat varme, god lysmengde og jevnt fuktig jord.",
    "watering": "Jevnt lett fuktig jord, ikke la potten tørke helt ut.",
    "seed_guide": {
      "sow": "Så inne eller direkte fra mars-juli.",
      "start": "Kan forkultiveres for jevnere start.",
      "repot": "Pottes/plantes om når småplantene er robuste.",
      "plant_out": "Trives best i kjølig til mildt drivhusklima.",
      "harvest": "Høstes fortløpende eller når hodet er utviklet."
    },
    "category": "urt",
    "latin_name": "Anthriscus cerefolium"
  },
  {
    "id": "fennel_bulb",
    "kind": "base",
    "profile_id": "fennel_bulb",
    "variant_id": null,
    "cultivar_id": null,
    "name": "knollfennikel",
    "display_name": "knollfennikel",
    "subtitle": "stilk/knoll",
    "family": "stilk/knoll",
    "icon": "🌱",
    "tone": "leafy",
    "ranges": {
      "airTemperature": {
        "optimal": [
          12.0,
          20.0
        ],
        "caution": [
          6.0,
          24.0
        ]
      },
      "airHumidity": {
        "optimal": [
          60.0,
          75.0
        ],
        "caution": [
          50.0,
          90.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          50.0,
          70.0
        ],
        "caution": [
          40.0,
          80.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          8.0,
          18.0
        ],
        "caution": [
          4.0,
          22.0
        ]
      },
      "ph": {
        "optimal": [
          6.0,
          7.0
        ],
        "caution": [
          5.5,
          7.5
        ]
      },
      "lux": {
        "optimal": [
          12000.0,
          30000.0
        ],
        "caution": [
          8000.0,
          35000.0
        ]
      }
    },
    "notes": "Kjølig til middels varm rotvekst som liker dyp, løs jord og jevn fukt.",
    "watering": "Moderat jevn fukt, ikke vannmettet jord.",
    "seed_guide": {
      "sow": "Så direkte fra april-juni.",
      "start": "Forkultivering er sjelden nødvendig.",
      "repot": "Unngå mye ompotting, røtter liker ro.",
      "plant_out": "Dyrkes direkte i dyp og løs jord.",
      "harvest": "Høstes når røttene har ønsket størrelse."
    },
    "category": "grønnsak",
    "latin_name": "Foeniculum vulgare var. azoricum"
  },
  {
    "id": "coriander",
    "kind": "base",
    "profile_id": "coriander",
    "variant_id": null,
    "cultivar_id": null,
    "name": "koriander",
    "display_name": "koriander",
    "subtitle": "bladurt kortlivd",
    "family": "bladurt kortlivd",
    "icon": "🌿",
    "tone": "leafy",
    "ranges": {
      "airTemperature": {
        "optimal": [
          16.0,
          22.0
        ],
        "caution": [
          10.0,
          26.0
        ]
      },
      "airHumidity": {
        "optimal": [
          55.0,
          75.0
        ],
        "caution": [
          45.0,
          85.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          50.0,
          75.0
        ],
        "caution": [
          40.0,
          85.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          14.0,
          20.0
        ],
        "caution": [
          8.0,
          24.0
        ]
      },
      "ph": {
        "optimal": [
          6.0,
          7.0
        ],
        "caution": [
          5.5,
          7.5
        ]
      },
      "lux": {
        "optimal": [
          12000.0,
          30000.0
        ],
        "caution": [
          8000.0,
          35000.0
        ]
      }
    },
    "notes": "Urt som liker moderat varme, god lysmengde og jevnt fuktig jord.",
    "watering": "Jevnt lett fuktig jord, ikke la potten tørke helt ut.",
    "seed_guide": {
      "sow": "Så inne eller direkte fra mars-juli.",
      "start": "Kan forkultiveres for jevnere start.",
      "repot": "Pottes/plantes om når småplantene er robuste.",
      "plant_out": "Trives best i kjølig til mildt drivhusklima.",
      "harvest": "Høstes fortløpende eller når hodet er utviklet."
    },
    "category": "urt",
    "latin_name": "Coriandrum sativum"
  },
  {
    "id": "cosmos",
    "kind": "base",
    "profile_id": "cosmos",
    "variant_id": null,
    "cultivar_id": null,
    "name": "kosmosblomst",
    "display_name": "kosmosblomst",
    "subtitle": "ettårig blomst",
    "family": "ettårig blomst",
    "icon": "🌸",
    "tone": "berry",
    "ranges": {
      "airTemperature": {
        "optimal": [
          18.0,
          24.0
        ],
        "caution": [
          10.0,
          28.0
        ]
      },
      "airHumidity": {
        "optimal": [
          50.0,
          70.0
        ],
        "caution": [
          40.0,
          80.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          45.0,
          70.0
        ],
        "caution": [
          35.0,
          80.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          16.0,
          20.0
        ],
        "caution": [
          10.0,
          24.0
        ]
      },
      "ph": {
        "optimal": [
          6.0,
          7.5
        ],
        "caution": [
          5.5,
          7.8
        ]
      },
      "lux": {
        "optimal": [
          20000.0,
          45000.0
        ],
        "caution": [
          15000.0,
          55000.0
        ]
      }
    },
    "notes": "Sommerblomst for drivhus og potter, liker sol, moderat temperatur og god lufting.",
    "watering": "Moderat vanning, unngå både uttørking og klissvåt jord.",
    "seed_guide": {
      "sow": "Start inne vår eller plant som småplante etter behov.",
      "start": "Gi lys, moderat varme og jevn fukt.",
      "repot": "Pottes om når røttene fyller potten.",
      "plant_out": "Settes i drivhus/krukke når veksten er i gang.",
      "harvest": "Følg blomstring/fruktsetting gjennom sesongen."
    },
    "category": "blomst",
    "latin_name": "Cosmos bipinnatus"
  },
  {
    "id": "cabbage",
    "kind": "base",
    "profile_id": "cabbage",
    "variant_id": null,
    "cultivar_id": null,
    "name": "kål",
    "display_name": "kål",
    "subtitle": "kålvekst kjølig",
    "family": "kålvekst kjølig",
    "icon": "🥬",
    "tone": "leafy",
    "ranges": {
      "airTemperature": {
        "optimal": [
          14.0,
          20.0
        ],
        "caution": [
          6.0,
          24.0
        ]
      },
      "airHumidity": {
        "optimal": [
          60.0,
          75.0
        ],
        "caution": [
          50.0,
          90.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          55.0,
          75.0
        ],
        "caution": [
          45.0,
          85.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          8.0,
          16.0
        ],
        "caution": [
          4.0,
          20.0
        ]
      },
      "ph": {
        "optimal": [
          6.0,
          7.0
        ],
        "caution": [
          5.5,
          7.5
        ]
      },
      "lux": {
        "optimal": [
          12000.0,
          30000.0
        ],
        "caution": [
          8000.0,
          35000.0
        ]
      }
    },
    "notes": "Kjølig til middels varm bladgrønnsak som liker jevn fukt og stabilt klima.",
    "watering": "Jevnt lett fuktig jord, ikke la den tørke helt ut.",
    "seed_guide": {
      "sow": "Så inne eller direkte fra mars-juli.",
      "start": "Kan forkultiveres for jevnere start.",
      "repot": "Pottes/plantes om når småplantene er robuste.",
      "plant_out": "Trives best i kjølig til mildt drivhusklima.",
      "harvest": "Høstes fortløpende eller når hodet er utviklet."
    },
    "category": "grønnsak",
    "latin_name": "Brassica oleracea"
  },
  {
    "id": "kohlrabi",
    "kind": "base",
    "profile_id": "kohlrabi",
    "variant_id": null,
    "cultivar_id": null,
    "name": "kålrabi",
    "display_name": "kålrabi",
    "subtitle": "rotgrønnsak",
    "family": "rotgrønnsak",
    "icon": "🥬",
    "tone": "leafy",
    "ranges": {
      "airTemperature": {
        "optimal": [
          12.0,
          20.0
        ],
        "caution": [
          6.0,
          24.0
        ]
      },
      "airHumidity": {
        "optimal": [
          60.0,
          75.0
        ],
        "caution": [
          50.0,
          90.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          50.0,
          70.0
        ],
        "caution": [
          40.0,
          80.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          8.0,
          18.0
        ],
        "caution": [
          4.0,
          22.0
        ]
      },
      "ph": {
        "optimal": [
          6.0,
          7.0
        ],
        "caution": [
          5.5,
          7.5
        ]
      },
      "lux": {
        "optimal": [
          12000.0,
          30000.0
        ],
        "caution": [
          8000.0,
          35000.0
        ]
      }
    },
    "notes": "Kjølig til middels varm rotvekst som liker dyp, løs jord og jevn fukt.",
    "watering": "Moderat jevn fukt, ikke vannmettet jord.",
    "seed_guide": {
      "sow": "Så direkte fra april-juni.",
      "start": "Forkultivering er sjelden nødvendig.",
      "repot": "Unngå mye ompotting, røtter liker ro.",
      "plant_out": "Dyrkes direkte i dyp og løs jord.",
      "harvest": "Høstes når røttene har ønsket størrelse."
    },
    "category": "grønnsak",
    "latin_name": "Brassica oleracea Gongylodes Group"
  },
  {
    "id": "bay",
    "kind": "base",
    "profile_id": "bay",
    "variant_id": null,
    "cultivar_id": null,
    "name": "laurbær",
    "display_name": "laurbær",
    "subtitle": "middelhavsurt",
    "family": "middelhavsurt",
    "icon": "🫐",
    "tone": "leafy",
    "ranges": {
      "airTemperature": {
        "optimal": [
          18.0,
          26.0
        ],
        "caution": [
          10.0,
          30.0
        ]
      },
      "airHumidity": {
        "optimal": [
          40.0,
          60.0
        ],
        "caution": [
          30.0,
          70.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          30.0,
          50.0
        ],
        "caution": [
          20.0,
          60.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          16.0,
          22.0
        ],
        "caution": [
          10.0,
          26.0
        ]
      },
      "ph": {
        "optimal": [
          6.5,
          7.5
        ],
        "caution": [
          6.0,
          8.0
        ]
      },
      "lux": {
        "optimal": [
          20000.0,
          50000.0
        ],
        "caution": [
          12000.0,
          60000.0
        ]
      }
    },
    "notes": "Middelhavsurt som liker varm, solrik og tørr plassering med veldrenert jord.",
    "watering": "Sparsom vanning, la jorden tørke godt opp mellom hver gang.",
    "seed_guide": {
      "sow": "Så inne fra mars-mai.",
      "start": "Startes lyst og jevnt fuktig.",
      "repot": "Pottes om når planten har god rotklump.",
      "plant_out": "Kan stå i drivhus, potte eller varm krok.",
      "harvest": "Høstes jevnlig ved å klippe skudd/topper."
    },
    "category": "urt",
    "latin_name": "Laurus nobilis"
  },
  {
    "id": "lavender",
    "kind": "base",
    "profile_id": "lavender",
    "variant_id": null,
    "cultivar_id": null,
    "name": "lavendel",
    "display_name": "lavendel",
    "subtitle": "middelhavsurt",
    "family": "middelhavsurt",
    "icon": "🌱",
    "tone": "berry",
    "ranges": {
      "airTemperature": {
        "optimal": [
          18.0,
          26.0
        ],
        "caution": [
          10.0,
          30.0
        ]
      },
      "airHumidity": {
        "optimal": [
          40.0,
          60.0
        ],
        "caution": [
          30.0,
          70.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          30.0,
          50.0
        ],
        "caution": [
          20.0,
          60.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          16.0,
          22.0
        ],
        "caution": [
          10.0,
          26.0
        ]
      },
      "ph": {
        "optimal": [
          6.5,
          7.5
        ],
        "caution": [
          6.0,
          8.0
        ]
      },
      "lux": {
        "optimal": [
          20000.0,
          50000.0
        ],
        "caution": [
          12000.0,
          60000.0
        ]
      }
    },
    "notes": "Middelhavsurt som liker varm, solrik og tørr plassering med veldrenert jord.",
    "watering": "Sparsom vanning, la jorden tørke godt opp mellom hver gang.",
    "seed_guide": {
      "sow": "Start inne vår eller plant som småplante etter behov.",
      "start": "Gi lys, moderat varme og jevn fukt.",
      "repot": "Pottes om når røttene fyller potten.",
      "plant_out": "Settes i drivhus/krukke når veksten er i gang.",
      "harvest": "Følg blomstring/fruktsetting gjennom sesongen."
    },
    "category": "blomst",
    "latin_name": "Lavandula angustifolia"
  },
  {
    "id": "lobelia",
    "kind": "base",
    "profile_id": "lobelia",
    "variant_id": null,
    "cultivar_id": null,
    "name": "lobelia",
    "display_name": "lobelia",
    "subtitle": "ampel/krukke",
    "family": "ampel/krukke",
    "icon": "🌱",
    "tone": "berry",
    "ranges": {
      "airTemperature": {
        "optimal": [
          18.0,
          24.0
        ],
        "caution": [
          10.0,
          28.0
        ]
      },
      "airHumidity": {
        "optimal": [
          50.0,
          70.0
        ],
        "caution": [
          40.0,
          80.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          45.0,
          70.0
        ],
        "caution": [
          35.0,
          80.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          16.0,
          20.0
        ],
        "caution": [
          10.0,
          24.0
        ]
      },
      "ph": {
        "optimal": [
          6.0,
          7.5
        ],
        "caution": [
          5.5,
          7.8
        ]
      },
      "lux": {
        "optimal": [
          20000.0,
          45000.0
        ],
        "caution": [
          15000.0,
          55000.0
        ]
      }
    },
    "notes": "Sommerblomst for drivhus og potter, liker sol, moderat temperatur og god lufting.",
    "watering": "Moderat vanning, unngå både uttørking og klissvåt jord.",
    "seed_guide": {
      "sow": "Start inne vår eller plant som småplante etter behov.",
      "start": "Gi lys, moderat varme og jevn fukt.",
      "repot": "Pottes om når røttene fyller potten.",
      "plant_out": "Settes i drivhus/krukke når veksten er i gang.",
      "harvest": "Følg blomstring/fruktsetting gjennom sesongen."
    },
    "category": "blomst",
    "latin_name": "Lobelia erinus"
  },
  {
    "id": "onion",
    "kind": "base",
    "profile_id": "onion",
    "variant_id": null,
    "cultivar_id": null,
    "name": "løk",
    "display_name": "løk",
    "subtitle": "løkvekst",
    "family": "løkvekst",
    "icon": "🧅",
    "tone": "leafy",
    "ranges": {
      "airTemperature": {
        "optimal": [
          14.0,
          22.0
        ],
        "caution": [
          4.0,
          26.0
        ]
      },
      "airHumidity": {
        "optimal": [
          60.0,
          75.0
        ],
        "caution": [
          50.0,
          85.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          50.0,
          70.0
        ],
        "caution": [
          40.0,
          80.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          8.0,
          18.0
        ],
        "caution": [
          4.0,
          22.0
        ]
      },
      "ph": {
        "optimal": [
          6.0,
          7.0
        ],
        "caution": [
          5.5,
          7.8
        ]
      },
      "lux": {
        "optimal": [
          15000.0,
          30000.0
        ],
        "caution": [
          8000.0,
          35000.0
        ]
      }
    },
    "notes": "Kjølig til mild løkvekst som liker veldrenert jord og moderat fukt.",
    "watering": "Moderat fukt, la jorden tørke lett mellom vanning.",
    "seed_guide": {
      "sow": "Så inne eller direkte fra mars-juli.",
      "start": "Kan forkultiveres for jevnere start.",
      "repot": "Pottes/plantes om når småplantene er robuste.",
      "plant_out": "Trives best i kjølig til mildt drivhusklima.",
      "harvest": "Høstes fortløpende eller når hodet er utviklet."
    },
    "category": "grønnsak",
    "latin_name": "Allium cepa"
  },
  {
    "id": "lovage",
    "kind": "base",
    "profile_id": "lovage",
    "variant_id": null,
    "cultivar_id": null,
    "name": "løpstikke",
    "display_name": "løpstikke",
    "subtitle": "flerårig urt",
    "family": "flerårig urt",
    "icon": "🌱",
    "tone": "leafy",
    "ranges": {
      "airTemperature": {
        "optimal": [
          16.0,
          22.0
        ],
        "caution": [
          10.0,
          26.0
        ]
      },
      "airHumidity": {
        "optimal": [
          55.0,
          75.0
        ],
        "caution": [
          45.0,
          85.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          50.0,
          75.0
        ],
        "caution": [
          40.0,
          85.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          14.0,
          20.0
        ],
        "caution": [
          8.0,
          24.0
        ]
      },
      "ph": {
        "optimal": [
          6.0,
          7.0
        ],
        "caution": [
          5.5,
          7.5
        ]
      },
      "lux": {
        "optimal": [
          12000.0,
          30000.0
        ],
        "caution": [
          8000.0,
          35000.0
        ]
      }
    },
    "notes": "Urt som liker moderat varme, god lysmengde og jevnt fuktig jord.",
    "watering": "Jevnt lett fuktig jord, ikke la potten tørke helt ut.",
    "seed_guide": {
      "sow": "Så inne fra mars-mai.",
      "start": "Startes lyst og jevnt fuktig.",
      "repot": "Pottes om når planten har god rotklump.",
      "plant_out": "Kan stå i drivhus, potte eller varm krok.",
      "harvest": "Høstes jevnlig ved å klippe skudd/topper."
    },
    "category": "urt",
    "latin_name": "Levisticum officinale"
  },
  {
    "id": "swiss_chard",
    "kind": "base",
    "profile_id": "swiss_chard",
    "variant_id": null,
    "cultivar_id": null,
    "name": "mangold",
    "display_name": "mangold",
    "subtitle": "bladgrønt",
    "family": "bladgrønt",
    "icon": "🌱",
    "tone": "leafy",
    "ranges": {
      "airTemperature": {
        "optimal": [
          14.0,
          20.0
        ],
        "caution": [
          6.0,
          24.0
        ]
      },
      "airHumidity": {
        "optimal": [
          60.0,
          75.0
        ],
        "caution": [
          50.0,
          90.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          55.0,
          75.0
        ],
        "caution": [
          45.0,
          85.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          8.0,
          16.0
        ],
        "caution": [
          4.0,
          20.0
        ]
      },
      "ph": {
        "optimal": [
          6.0,
          7.0
        ],
        "caution": [
          5.5,
          7.5
        ]
      },
      "lux": {
        "optimal": [
          12000.0,
          30000.0
        ],
        "caution": [
          8000.0,
          35000.0
        ]
      }
    },
    "notes": "Kjølig til middels varm bladgrønnsak som liker jevn fukt og stabilt klima.",
    "watering": "Jevnt lett fuktig jord, ikke la den tørke helt ut.",
    "seed_guide": {
      "sow": "Så inne eller direkte fra mars-juli.",
      "start": "Kan forkultiveres for jevnere start.",
      "repot": "Pottes/plantes om når småplantene er robuste.",
      "plant_out": "Trives best i kjølig til mildt drivhusklima.",
      "harvest": "Høstes fortløpende eller når hodet er utviklet."
    },
    "category": "grønnsak",
    "latin_name": "Beta vulgaris subsp. vulgaris"
  },
  {
    "id": "melon",
    "kind": "base",
    "profile_id": "melon",
    "variant_id": null,
    "cultivar_id": null,
    "name": "melon",
    "display_name": "melon",
    "subtitle": "varmeelskende fruktgrønnsak",
    "family": "varmeelskende fruktgrønnsak",
    "icon": "🍈",
    "tone": "leafy",
    "ranges": {
      "airTemperature": {
        "optimal": [
          21.0,
          26.0
        ],
        "caution": [
          18.0,
          32.0
        ]
      },
      "airHumidity": {
        "optimal": [
          60.0,
          75.0
        ],
        "caution": [
          50.0,
          85.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          60.0,
          80.0
        ],
        "caution": [
          50.0,
          90.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          18.0,
          22.0
        ],
        "caution": [
          15.0,
          26.0
        ]
      },
      "ph": {
        "optimal": [
          5.8,
          6.8
        ],
        "caution": [
          5.5,
          7.5
        ]
      },
      "lux": {
        "optimal": [
          25000.0,
          60000.0
        ],
        "caution": [
          15000.0,
          70000.0
        ]
      }
    },
    "notes": "Varm og lyselskende drivhusplante som ikke tåler kulde eller langvarig hete.",
    "watering": "Jevnt fuktig jord, ikke la tørke helt ut.",
    "seed_guide": {
      "sow": "Så inne i mars-april.",
      "start": "Forkultiveres inne med varme og godt lys.",
      "repot": "Pottes om når røttene fyller potten.",
      "plant_out": "Flyttes til drivhus fra mai-juni.",
      "harvest": "Høstes når frukt eller blader er modne."
    },
    "category": "grønnsak",
    "latin_name": "Cucumis melo"
  },
  {
    "id": "marjoram",
    "kind": "base",
    "profile_id": "marjoram",
    "variant_id": null,
    "cultivar_id": null,
    "name": "merian",
    "display_name": "merian",
    "subtitle": "middelhavsurt",
    "family": "middelhavsurt",
    "icon": "🌱",
    "tone": "leafy",
    "ranges": {
      "airTemperature": {
        "optimal": [
          18.0,
          26.0
        ],
        "caution": [
          10.0,
          30.0
        ]
      },
      "airHumidity": {
        "optimal": [
          40.0,
          60.0
        ],
        "caution": [
          30.0,
          70.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          30.0,
          50.0
        ],
        "caution": [
          20.0,
          60.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          16.0,
          22.0
        ],
        "caution": [
          10.0,
          26.0
        ]
      },
      "ph": {
        "optimal": [
          6.5,
          7.5
        ],
        "caution": [
          6.0,
          8.0
        ]
      },
      "lux": {
        "optimal": [
          20000.0,
          50000.0
        ],
        "caution": [
          12000.0,
          60000.0
        ]
      }
    },
    "notes": "Middelhavsurt som liker varm, solrik og tørr plassering med veldrenert jord.",
    "watering": "Sparsom vanning, la jorden tørke godt opp mellom hver gang.",
    "seed_guide": {
      "sow": "Så inne fra mars-mai.",
      "start": "Startes lyst og jevnt fuktig.",
      "repot": "Pottes om når planten har god rotklump.",
      "plant_out": "Kan stå i drivhus, potte eller varm krok.",
      "harvest": "Høstes jevnlig ved å klippe skudd/topper."
    },
    "category": "urt",
    "latin_name": "Origanum majorana"
  },
  {
    "id": "mizuna",
    "kind": "base",
    "profile_id": "mizuna",
    "variant_id": null,
    "cultivar_id": null,
    "name": "mizuna",
    "display_name": "mizuna",
    "subtitle": "bladgrønt",
    "family": "bladgrønt",
    "icon": "🌱",
    "tone": "leafy",
    "ranges": {
      "airTemperature": {
        "optimal": [
          14.0,
          20.0
        ],
        "caution": [
          6.0,
          24.0
        ]
      },
      "airHumidity": {
        "optimal": [
          60.0,
          75.0
        ],
        "caution": [
          50.0,
          90.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          55.0,
          75.0
        ],
        "caution": [
          45.0,
          85.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          8.0,
          16.0
        ],
        "caution": [
          4.0,
          20.0
        ]
      },
      "ph": {
        "optimal": [
          6.0,
          7.0
        ],
        "caution": [
          5.5,
          7.5
        ]
      },
      "lux": {
        "optimal": [
          12000.0,
          30000.0
        ],
        "caution": [
          8000.0,
          35000.0
        ]
      }
    },
    "notes": "Kjølig til middels varm bladgrønnsak som liker jevn fukt og stabilt klima.",
    "watering": "Jevnt lett fuktig jord, ikke la den tørke helt ut.",
    "seed_guide": {
      "sow": "Så inne eller direkte fra mars-juli.",
      "start": "Kan forkultiveres for jevnere start.",
      "repot": "Pottes/plantes om når småplantene er robuste.",
      "plant_out": "Trives best i kjølig til mildt drivhusklima.",
      "harvest": "Høstes fortløpende eller når hodet er utviklet."
    },
    "category": "grønnsak",
    "latin_name": "Brassica rapa var. nipposinica"
  },
  {
    "id": "mint",
    "kind": "base",
    "profile_id": "mint",
    "variant_id": null,
    "cultivar_id": null,
    "name": "mynte",
    "display_name": "mynte",
    "subtitle": "flerårig urt",
    "family": "flerårig urt",
    "icon": "🌿",
    "tone": "leafy",
    "ranges": {
      "airTemperature": {
        "optimal": [
          16.0,
          22.0
        ],
        "caution": [
          10.0,
          26.0
        ]
      },
      "airHumidity": {
        "optimal": [
          55.0,
          75.0
        ],
        "caution": [
          45.0,
          85.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          50.0,
          75.0
        ],
        "caution": [
          40.0,
          85.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          14.0,
          20.0
        ],
        "caution": [
          8.0,
          24.0
        ]
      },
      "ph": {
        "optimal": [
          6.0,
          7.0
        ],
        "caution": [
          5.5,
          7.5
        ]
      },
      "lux": {
        "optimal": [
          12000.0,
          30000.0
        ],
        "caution": [
          8000.0,
          35000.0
        ]
      }
    },
    "notes": "Urt som liker moderat varme, god lysmengde og jevnt fuktig jord.",
    "watering": "Jevnt lett fuktig jord, ikke la potten tørke helt ut.",
    "seed_guide": {
      "sow": "Så inne fra mars-mai.",
      "start": "Startes lyst og jevnt fuktig.",
      "repot": "Pottes om når planten har god rotklump.",
      "plant_out": "Kan stå i drivhus, potte eller varm krok.",
      "harvest": "Høstes jevnlig ved å klippe skudd/topper."
    },
    "category": "urt",
    "latin_name": "Mentha spp."
  },
  {
    "id": "turnip",
    "kind": "base",
    "profile_id": "turnip",
    "variant_id": null,
    "cultivar_id": null,
    "name": "nepe",
    "display_name": "nepe",
    "subtitle": "rotgrønnsak",
    "family": "rotgrønnsak",
    "icon": "🌱",
    "tone": "leafy",
    "ranges": {
      "airTemperature": {
        "optimal": [
          12.0,
          20.0
        ],
        "caution": [
          6.0,
          24.0
        ]
      },
      "airHumidity": {
        "optimal": [
          60.0,
          75.0
        ],
        "caution": [
          50.0,
          90.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          50.0,
          70.0
        ],
        "caution": [
          40.0,
          80.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          8.0,
          18.0
        ],
        "caution": [
          4.0,
          22.0
        ]
      },
      "ph": {
        "optimal": [
          6.0,
          7.0
        ],
        "caution": [
          5.5,
          7.5
        ]
      },
      "lux": {
        "optimal": [
          12000.0,
          30000.0
        ],
        "caution": [
          8000.0,
          35000.0
        ]
      }
    },
    "notes": "Kjølig til middels varm rotvekst som liker dyp, løs jord og jevn fukt.",
    "watering": "Moderat jevn fukt, ikke vannmettet jord.",
    "seed_guide": {
      "sow": "Så direkte fra april-juni.",
      "start": "Forkultivering er sjelden nødvendig.",
      "repot": "Unngå mye ompotting, røtter liker ro.",
      "plant_out": "Dyrkes direkte i dyp og løs jord.",
      "harvest": "Høstes når røttene har ønsket størrelse."
    },
    "category": "grønnsak",
    "latin_name": "Brassica rapa subsp. rapa"
  },
  {
    "id": "okra",
    "kind": "base",
    "profile_id": "okra",
    "variant_id": null,
    "cultivar_id": null,
    "name": "okra",
    "display_name": "okra",
    "subtitle": "varmeelskende fruktgrønnsak",
    "family": "varmeelskende fruktgrønnsak",
    "icon": "🌱",
    "tone": "leafy",
    "ranges": {
      "airTemperature": {
        "optimal": [
          21.0,
          26.0
        ],
        "caution": [
          18.0,
          32.0
        ]
      },
      "airHumidity": {
        "optimal": [
          60.0,
          75.0
        ],
        "caution": [
          50.0,
          85.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          60.0,
          80.0
        ],
        "caution": [
          50.0,
          90.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          18.0,
          22.0
        ],
        "caution": [
          15.0,
          26.0
        ]
      },
      "ph": {
        "optimal": [
          5.8,
          6.8
        ],
        "caution": [
          5.5,
          7.5
        ]
      },
      "lux": {
        "optimal": [
          25000.0,
          60000.0
        ],
        "caution": [
          15000.0,
          70000.0
        ]
      }
    },
    "notes": "Varm og lyselskende drivhusplante som ikke tåler kulde eller langvarig hete.",
    "watering": "Jevnt fuktig jord, ikke la tørke helt ut.",
    "seed_guide": {
      "sow": "Så inne i mars-april.",
      "start": "Forkultiveres inne med varme og godt lys.",
      "repot": "Pottes om når røttene fyller potten.",
      "plant_out": "Flyttes til drivhus fra mai-juni.",
      "harvest": "Høstes når frukt eller blader er modne."
    },
    "category": "grønnsak",
    "latin_name": "Abelmoschus esculentus"
  },
  {
    "id": "oregano",
    "kind": "base",
    "profile_id": "oregano",
    "variant_id": null,
    "cultivar_id": null,
    "name": "oregano",
    "display_name": "oregano",
    "subtitle": "middelhavsurt",
    "family": "middelhavsurt",
    "icon": "🌿",
    "tone": "leafy",
    "ranges": {
      "airTemperature": {
        "optimal": [
          18.0,
          26.0
        ],
        "caution": [
          10.0,
          30.0
        ]
      },
      "airHumidity": {
        "optimal": [
          40.0,
          60.0
        ],
        "caution": [
          30.0,
          70.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          30.0,
          50.0
        ],
        "caution": [
          20.0,
          60.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          16.0,
          22.0
        ],
        "caution": [
          10.0,
          26.0
        ]
      },
      "ph": {
        "optimal": [
          6.5,
          7.5
        ],
        "caution": [
          6.0,
          8.0
        ]
      },
      "lux": {
        "optimal": [
          20000.0,
          50000.0
        ],
        "caution": [
          12000.0,
          60000.0
        ]
      }
    },
    "notes": "Middelhavsurt som liker varm, solrik og tørr plassering med veldrenert jord.",
    "watering": "Sparsom vanning, la jorden tørke godt opp mellom hver gang.",
    "seed_guide": {
      "sow": "Så inne fra mars-mai.",
      "start": "Startes lyst og jevnt fuktig.",
      "repot": "Pottes om når planten har god rotklump.",
      "plant_out": "Kan stå i drivhus, potte eller varm krok.",
      "harvest": "Høstes jevnlig ved å klippe skudd/topper."
    },
    "category": "urt",
    "latin_name": "Origanum vulgare"
  },
  {
    "id": "pak_choi",
    "kind": "base",
    "profile_id": "pak_choi",
    "variant_id": null,
    "cultivar_id": null,
    "name": "pak choi",
    "display_name": "pak choi",
    "subtitle": "kålvekst bladgrønt",
    "family": "kålvekst bladgrønt",
    "icon": "🌱",
    "tone": "leafy",
    "ranges": {
      "airTemperature": {
        "optimal": [
          14.0,
          20.0
        ],
        "caution": [
          6.0,
          24.0
        ]
      },
      "airHumidity": {
        "optimal": [
          60.0,
          75.0
        ],
        "caution": [
          50.0,
          90.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          55.0,
          75.0
        ],
        "caution": [
          45.0,
          85.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          8.0,
          16.0
        ],
        "caution": [
          4.0,
          20.0
        ]
      },
      "ph": {
        "optimal": [
          6.0,
          7.0
        ],
        "caution": [
          5.5,
          7.5
        ]
      },
      "lux": {
        "optimal": [
          12000.0,
          30000.0
        ],
        "caution": [
          8000.0,
          35000.0
        ]
      }
    },
    "notes": "Kjølig til middels varm bladgrønnsak som liker jevn fukt og stabilt klima.",
    "watering": "Jevnt lett fuktig jord, ikke la den tørke helt ut.",
    "seed_guide": {
      "sow": "Så inne eller direkte fra mars-juli.",
      "start": "Kan forkultiveres for jevnere start.",
      "repot": "Pottes/plantes om når småplantene er robuste.",
      "plant_out": "Trives best i kjølig til mildt drivhusklima.",
      "harvest": "Høstes fortløpende eller når hodet er utviklet."
    },
    "category": "grønnsak",
    "latin_name": "Brassica rapa subsp. chinensis"
  },
  {
    "id": "pepper",
    "kind": "base",
    "profile_id": "pepper",
    "variant_id": null,
    "cultivar_id": null,
    "name": "paprika",
    "display_name": "paprika",
    "subtitle": "varmeelskende fruktgrønnsak",
    "family": "varmeelskende fruktgrønnsak",
    "icon": "🫑",
    "tone": "pepper",
    "ranges": {
      "airTemperature": {
        "optimal": [
          21.0,
          26.0
        ],
        "caution": [
          18.0,
          32.0
        ]
      },
      "airHumidity": {
        "optimal": [
          60.0,
          75.0
        ],
        "caution": [
          50.0,
          85.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          60.0,
          80.0
        ],
        "caution": [
          50.0,
          90.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          18.0,
          22.0
        ],
        "caution": [
          15.0,
          26.0
        ]
      },
      "ph": {
        "optimal": [
          5.8,
          6.8
        ],
        "caution": [
          5.5,
          7.5
        ]
      },
      "lux": {
        "optimal": [
          25000.0,
          60000.0
        ],
        "caution": [
          15000.0,
          70000.0
        ]
      }
    },
    "notes": "Varm og lyselskende drivhusplante som ikke tåler kulde eller langvarig hete.",
    "watering": "Jevnt fuktig jord, ikke la tørke helt ut.",
    "seed_guide": {
      "sow": "Så inne i februar-mars.",
      "start": "Startes inne tidlig, varmt og lyst.",
      "repot": "Pottes om når røttene fyller småpotten.",
      "plant_out": "Settes i drivhus fra mai-juni.",
      "harvest": "Høstes fra juli og utover."
    },
    "category": "grønnsak",
    "latin_name": "Capsicum annuum"
  },
  {
    "id": "parsnip",
    "kind": "base",
    "profile_id": "parsnip",
    "variant_id": null,
    "cultivar_id": null,
    "name": "pastinakk",
    "display_name": "pastinakk",
    "subtitle": "rotgrønnsak",
    "family": "rotgrønnsak",
    "icon": "🌱",
    "tone": "leafy",
    "ranges": {
      "airTemperature": {
        "optimal": [
          12.0,
          20.0
        ],
        "caution": [
          6.0,
          24.0
        ]
      },
      "airHumidity": {
        "optimal": [
          60.0,
          75.0
        ],
        "caution": [
          50.0,
          90.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          50.0,
          70.0
        ],
        "caution": [
          40.0,
          80.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          8.0,
          18.0
        ],
        "caution": [
          4.0,
          22.0
        ]
      },
      "ph": {
        "optimal": [
          6.0,
          7.0
        ],
        "caution": [
          5.5,
          7.5
        ]
      },
      "lux": {
        "optimal": [
          12000.0,
          30000.0
        ],
        "caution": [
          8000.0,
          35000.0
        ]
      }
    },
    "notes": "Kjølig til middels varm rotvekst som liker dyp, løs jord og jevn fukt.",
    "watering": "Moderat jevn fukt, ikke vannmettet jord.",
    "seed_guide": {
      "sow": "Så direkte fra april-juni.",
      "start": "Forkultivering er sjelden nødvendig.",
      "repot": "Unngå mye ompotting, røtter liker ro.",
      "plant_out": "Dyrkes direkte i dyp og løs jord.",
      "harvest": "Høstes når røttene har ønsket størrelse."
    },
    "category": "grønnsak",
    "latin_name": "Pastinaca sativa"
  },
  {
    "id": "geranium",
    "kind": "base",
    "profile_id": "geranium",
    "variant_id": null,
    "cultivar_id": null,
    "name": "pelargonium",
    "display_name": "pelargonium",
    "subtitle": "potteblomst",
    "family": "potteblomst",
    "icon": "🌱",
    "tone": "berry",
    "ranges": {
      "airTemperature": {
        "optimal": [
          18.0,
          24.0
        ],
        "caution": [
          10.0,
          28.0
        ]
      },
      "airHumidity": {
        "optimal": [
          50.0,
          70.0
        ],
        "caution": [
          40.0,
          80.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          45.0,
          70.0
        ],
        "caution": [
          35.0,
          80.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          16.0,
          20.0
        ],
        "caution": [
          10.0,
          24.0
        ]
      },
      "ph": {
        "optimal": [
          6.0,
          7.5
        ],
        "caution": [
          5.5,
          7.8
        ]
      },
      "lux": {
        "optimal": [
          20000.0,
          45000.0
        ],
        "caution": [
          15000.0,
          55000.0
        ]
      }
    },
    "notes": "Sommerblomst for drivhus og potter, liker sol, moderat temperatur og god lufting.",
    "watering": "Moderat vanning, unngå både uttørking og klissvåt jord.",
    "seed_guide": {
      "sow": "Start inne vår eller plant som småplante etter behov.",
      "start": "Gi lys, moderat varme og jevn fukt.",
      "repot": "Pottes om når røttene fyller potten.",
      "plant_out": "Settes i drivhus/krukke når veksten er i gang.",
      "harvest": "Følg blomstring/fruktsetting gjennom sesongen."
    },
    "category": "blomst",
    "latin_name": "Pelargonium zonale"
  },
  {
    "id": "parsley",
    "kind": "base",
    "profile_id": "parsley",
    "variant_id": null,
    "cultivar_id": null,
    "name": "persille",
    "display_name": "persille",
    "subtitle": "bladurt",
    "family": "bladurt",
    "icon": "🌿",
    "tone": "leafy",
    "ranges": {
      "airTemperature": {
        "optimal": [
          16.0,
          22.0
        ],
        "caution": [
          10.0,
          26.0
        ]
      },
      "airHumidity": {
        "optimal": [
          55.0,
          75.0
        ],
        "caution": [
          45.0,
          85.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          50.0,
          75.0
        ],
        "caution": [
          40.0,
          85.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          14.0,
          20.0
        ],
        "caution": [
          8.0,
          24.0
        ]
      },
      "ph": {
        "optimal": [
          6.0,
          7.0
        ],
        "caution": [
          5.5,
          7.5
        ]
      },
      "lux": {
        "optimal": [
          12000.0,
          30000.0
        ],
        "caution": [
          8000.0,
          35000.0
        ]
      }
    },
    "notes": "Urt som liker moderat varme, god lysmengde og jevnt fuktig jord.",
    "watering": "Jevnt lett fuktig jord, ikke la potten tørke helt ut.",
    "seed_guide": {
      "sow": "Så inne eller direkte fra mars-juli.",
      "start": "Kan forkultiveres for jevnere start.",
      "repot": "Pottes/plantes om når småplantene er robuste.",
      "plant_out": "Trives best i kjølig til mildt drivhusklima.",
      "harvest": "Høstes fortløpende eller når hodet er utviklet."
    },
    "category": "urt",
    "latin_name": "Petroselinum crispum"
  },
  {
    "id": "petunia",
    "kind": "base",
    "profile_id": "petunia",
    "variant_id": null,
    "cultivar_id": null,
    "name": "petunia",
    "display_name": "petunia",
    "subtitle": "ettårig blomst",
    "family": "ettårig blomst",
    "icon": "🌱",
    "tone": "berry",
    "ranges": {
      "airTemperature": {
        "optimal": [
          18.0,
          24.0
        ],
        "caution": [
          10.0,
          28.0
        ]
      },
      "airHumidity": {
        "optimal": [
          50.0,
          70.0
        ],
        "caution": [
          40.0,
          80.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          45.0,
          70.0
        ],
        "caution": [
          35.0,
          80.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          16.0,
          20.0
        ],
        "caution": [
          10.0,
          24.0
        ]
      },
      "ph": {
        "optimal": [
          6.0,
          7.5
        ],
        "caution": [
          5.5,
          7.8
        ]
      },
      "lux": {
        "optimal": [
          20000.0,
          45000.0
        ],
        "caution": [
          15000.0,
          55000.0
        ]
      }
    },
    "notes": "Sommerblomst for drivhus og potter, liker sol, moderat temperatur og god lufting.",
    "watering": "Moderat vanning, unngå både uttørking og klissvåt jord.",
    "seed_guide": {
      "sow": "Start inne vår eller plant som småplante etter behov.",
      "start": "Gi lys, moderat varme og jevn fukt.",
      "repot": "Pottes om når røttene fyller potten.",
      "plant_out": "Settes i drivhus/krukke når veksten er i gang.",
      "harvest": "Følg blomstring/fruktsetting gjennom sesongen."
    },
    "category": "blomst",
    "latin_name": "Petunia x hybrida"
  },
  {
    "id": "purslane",
    "kind": "base",
    "profile_id": "purslane",
    "variant_id": null,
    "cultivar_id": null,
    "name": "portulakk",
    "display_name": "portulakk",
    "subtitle": "bladgrønt",
    "family": "bladgrønt",
    "icon": "🌱",
    "tone": "leafy",
    "ranges": {
      "airTemperature": {
        "optimal": [
          14.0,
          20.0
        ],
        "caution": [
          6.0,
          24.0
        ]
      },
      "airHumidity": {
        "optimal": [
          60.0,
          75.0
        ],
        "caution": [
          50.0,
          90.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          55.0,
          75.0
        ],
        "caution": [
          45.0,
          85.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          8.0,
          16.0
        ],
        "caution": [
          4.0,
          20.0
        ]
      },
      "ph": {
        "optimal": [
          6.0,
          7.0
        ],
        "caution": [
          5.5,
          7.5
        ]
      },
      "lux": {
        "optimal": [
          12000.0,
          30000.0
        ],
        "caution": [
          8000.0,
          35000.0
        ]
      }
    },
    "notes": "Kjølig til middels varm bladgrønnsak som liker jevn fukt og stabilt klima.",
    "watering": "Jevnt lett fuktig jord, ikke la den tørke helt ut.",
    "seed_guide": {
      "sow": "Så inne eller direkte fra mars-juli.",
      "start": "Kan forkultiveres for jevnere start.",
      "repot": "Pottes/plantes om når småplantene er robuste.",
      "plant_out": "Trives best i kjølig til mildt drivhusklima.",
      "harvest": "Høstes fortløpende eller når hodet er utviklet."
    },
    "category": "grønnsak",
    "latin_name": "Portulaca oleracea"
  },
  {
    "id": "potato",
    "kind": "base",
    "profile_id": "potato",
    "variant_id": null,
    "cultivar_id": null,
    "name": "potet",
    "display_name": "potet",
    "subtitle": "knollvekst",
    "family": "knollvekst",
    "icon": "🥔",
    "tone": "leafy",
    "ranges": {
      "airTemperature": {
        "optimal": [
          12.0,
          20.0
        ],
        "caution": [
          6.0,
          24.0
        ]
      },
      "airHumidity": {
        "optimal": [
          60.0,
          75.0
        ],
        "caution": [
          50.0,
          90.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          50.0,
          70.0
        ],
        "caution": [
          40.0,
          80.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          8.0,
          18.0
        ],
        "caution": [
          4.0,
          22.0
        ]
      },
      "ph": {
        "optimal": [
          6.0,
          7.0
        ],
        "caution": [
          5.5,
          7.5
        ]
      },
      "lux": {
        "optimal": [
          12000.0,
          30000.0
        ],
        "caution": [
          8000.0,
          35000.0
        ]
      }
    },
    "notes": "Kjølig til middels varm rotvekst som liker dyp, løs jord og jevn fukt.",
    "watering": "Moderat jevn fukt, ikke vannmettet jord.",
    "seed_guide": {
      "sow": "Så direkte fra april-juni.",
      "start": "Forkultivering er sjelden nødvendig.",
      "repot": "Unngå mye ompotting, røtter liker ro.",
      "plant_out": "Dyrkes direkte i dyp og løs jord.",
      "harvest": "Høstes når røttene har ønsket størrelse."
    },
    "category": "grønnsak",
    "latin_name": "Solanum tuberosum"
  },
  {
    "id": "leek",
    "kind": "base",
    "profile_id": "leek",
    "variant_id": null,
    "cultivar_id": null,
    "name": "purre",
    "display_name": "purre",
    "subtitle": "løkvekst",
    "family": "løkvekst",
    "icon": "🌱",
    "tone": "leafy",
    "ranges": {
      "airTemperature": {
        "optimal": [
          14.0,
          22.0
        ],
        "caution": [
          4.0,
          26.0
        ]
      },
      "airHumidity": {
        "optimal": [
          60.0,
          75.0
        ],
        "caution": [
          50.0,
          85.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          50.0,
          70.0
        ],
        "caution": [
          40.0,
          80.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          8.0,
          18.0
        ],
        "caution": [
          4.0,
          22.0
        ]
      },
      "ph": {
        "optimal": [
          6.0,
          7.0
        ],
        "caution": [
          5.5,
          7.8
        ]
      },
      "lux": {
        "optimal": [
          15000.0,
          30000.0
        ],
        "caution": [
          8000.0,
          35000.0
        ]
      }
    },
    "notes": "Kjølig til mild løkvekst som liker veldrenert jord og moderat fukt.",
    "watering": "Moderat fukt, la jorden tørke lett mellom vanning.",
    "seed_guide": {
      "sow": "Så inne eller direkte fra mars-juli.",
      "start": "Kan forkultiveres for jevnere start.",
      "repot": "Pottes/plantes om når småplantene er robuste.",
      "plant_out": "Trives best i kjølig til mildt drivhusklima.",
      "harvest": "Høstes fortløpende eller når hodet er utviklet."
    },
    "category": "grønnsak",
    "latin_name": "Allium ampeloprasum"
  },
  {
    "id": "rhubarb",
    "kind": "base",
    "profile_id": "rhubarb",
    "variant_id": null,
    "cultivar_id": null,
    "name": "rabarbra",
    "display_name": "rabarbra",
    "subtitle": "stilkvekst",
    "family": "stilkvekst",
    "icon": "🌱",
    "tone": "leafy",
    "ranges": {
      "airTemperature": {
        "optimal": [
          16.0,
          22.0
        ],
        "caution": [
          8.0,
          26.0
        ]
      },
      "airHumidity": {
        "optimal": [
          65.0,
          80.0
        ],
        "caution": [
          55.0,
          90.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          65.0,
          80.0
        ],
        "caution": [
          55.0,
          90.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          14.0,
          18.0
        ],
        "caution": [
          8.0,
          22.0
        ]
      },
      "ph": {
        "optimal": [
          6.0,
          7.0
        ],
        "caution": [
          5.8,
          7.5
        ]
      },
      "lux": {
        "optimal": [
          15000.0,
          30000.0
        ],
        "caution": [
          8000.0,
          35000.0
        ]
      }
    },
    "notes": "Stilkvekst som krever jevn høy jordfukt og moderat temperatur.",
    "watering": "Fuktig jord nesten hele tiden, ikke la tørke helt ut.",
    "seed_guide": {
      "sow": "Så inne eller direkte fra mars-juli.",
      "start": "Kan forkultiveres for jevnere start.",
      "repot": "Pottes/plantes om når småplantene er robuste.",
      "plant_out": "Trives best i kjølig til mildt drivhusklima.",
      "harvest": "Høstes fortløpende eller når hodet er utviklet."
    },
    "category": "grønnsak",
    "latin_name": "Rheum rhabarbarum"
  },
  {
    "id": "radicchio",
    "kind": "base",
    "profile_id": "radicchio",
    "variant_id": null,
    "cultivar_id": null,
    "name": "radicchio",
    "display_name": "radicchio",
    "subtitle": "bladgrønt",
    "family": "bladgrønt",
    "icon": "🌱",
    "tone": "leafy",
    "ranges": {
      "airTemperature": {
        "optimal": [
          14.0,
          20.0
        ],
        "caution": [
          6.0,
          24.0
        ]
      },
      "airHumidity": {
        "optimal": [
          60.0,
          75.0
        ],
        "caution": [
          50.0,
          90.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          55.0,
          75.0
        ],
        "caution": [
          45.0,
          85.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          8.0,
          16.0
        ],
        "caution": [
          4.0,
          20.0
        ]
      },
      "ph": {
        "optimal": [
          6.0,
          7.0
        ],
        "caution": [
          5.5,
          7.5
        ]
      },
      "lux": {
        "optimal": [
          12000.0,
          30000.0
        ],
        "caution": [
          8000.0,
          35000.0
        ]
      }
    },
    "notes": "Kjølig til middels varm bladgrønnsak som liker jevn fukt og stabilt klima.",
    "watering": "Jevnt lett fuktig jord, ikke la den tørke helt ut.",
    "seed_guide": {
      "sow": "Så inne eller direkte fra mars-juli.",
      "start": "Kan forkultiveres for jevnere start.",
      "repot": "Pottes/plantes om når småplantene er robuste.",
      "plant_out": "Trives best i kjølig til mildt drivhusklima.",
      "harvest": "Høstes fortløpende eller når hodet er utviklet."
    },
    "category": "grønnsak",
    "latin_name": "Cichorium intybus"
  },
  {
    "id": "radish",
    "kind": "base",
    "profile_id": "radish",
    "variant_id": null,
    "cultivar_id": null,
    "name": "reddik",
    "display_name": "reddik",
    "subtitle": "kjølig rotgrønnsak",
    "family": "kjølig rotgrønnsak",
    "icon": "🫜",
    "tone": "leafy",
    "ranges": {
      "airTemperature": {
        "optimal": [
          12.0,
          20.0
        ],
        "caution": [
          6.0,
          24.0
        ]
      },
      "airHumidity": {
        "optimal": [
          60.0,
          75.0
        ],
        "caution": [
          50.0,
          90.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          50.0,
          70.0
        ],
        "caution": [
          40.0,
          80.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          8.0,
          18.0
        ],
        "caution": [
          4.0,
          22.0
        ]
      },
      "ph": {
        "optimal": [
          6.0,
          7.0
        ],
        "caution": [
          5.5,
          7.5
        ]
      },
      "lux": {
        "optimal": [
          12000.0,
          30000.0
        ],
        "caution": [
          8000.0,
          35000.0
        ]
      }
    },
    "notes": "Kjølig til middels varm rotvekst som liker dyp, løs jord og jevn fukt.",
    "watering": "Moderat jevn fukt, ikke vannmettet jord.",
    "seed_guide": {
      "sow": "Så direkte fra april-juni.",
      "start": "Forkultivering er sjelden nødvendig.",
      "repot": "Unngå mye ompotting, røtter liker ro.",
      "plant_out": "Dyrkes direkte i dyp og løs jord.",
      "harvest": "Høstes når røttene har ønsket størrelse."
    },
    "category": "grønnsak",
    "latin_name": "Raphanus sativus"
  },
  {
    "id": "calendula",
    "kind": "base",
    "profile_id": "calendula",
    "variant_id": null,
    "cultivar_id": null,
    "name": "ringblomst",
    "display_name": "ringblomst",
    "subtitle": "ettårig blomst",
    "family": "ettårig blomst",
    "icon": "🌸",
    "tone": "berry",
    "ranges": {
      "airTemperature": {
        "optimal": [
          18.0,
          24.0
        ],
        "caution": [
          10.0,
          28.0
        ]
      },
      "airHumidity": {
        "optimal": [
          50.0,
          70.0
        ],
        "caution": [
          40.0,
          80.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          45.0,
          70.0
        ],
        "caution": [
          35.0,
          80.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          16.0,
          20.0
        ],
        "caution": [
          10.0,
          24.0
        ]
      },
      "ph": {
        "optimal": [
          6.0,
          7.5
        ],
        "caution": [
          5.5,
          7.8
        ]
      },
      "lux": {
        "optimal": [
          20000.0,
          45000.0
        ],
        "caution": [
          15000.0,
          55000.0
        ]
      }
    },
    "notes": "Sommerblomst for drivhus og potter, liker sol, moderat temperatur og god lufting.",
    "watering": "Moderat vanning, unngå både uttørking og klissvåt jord.",
    "seed_guide": {
      "sow": "Start inne vår eller plant som småplante etter behov.",
      "start": "Gi lys, moderat varme og jevn fukt.",
      "repot": "Pottes om når røttene fyller potten.",
      "plant_out": "Settes i drivhus/krukke når veksten er i gang.",
      "harvest": "Følg blomstring/fruktsetting gjennom sesongen."
    },
    "category": "blomst",
    "latin_name": "Calendula officinalis"
  },
  {
    "id": "red_currant",
    "kind": "base",
    "profile_id": "red_currant",
    "variant_id": null,
    "cultivar_id": null,
    "name": "rips",
    "display_name": "rips",
    "subtitle": "bær busk",
    "family": "bær busk",
    "icon": "🌱",
    "tone": "berry",
    "ranges": {
      "airTemperature": {
        "optimal": [
          16.0,
          22.0
        ],
        "caution": [
          8.0,
          26.0
        ]
      },
      "airHumidity": {
        "optimal": [
          60.0,
          75.0
        ],
        "caution": [
          50.0,
          85.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          55.0,
          75.0
        ],
        "caution": [
          45.0,
          85.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          12.0,
          18.0
        ],
        "caution": [
          8.0,
          22.0
        ]
      },
      "ph": {
        "optimal": [
          5.3,
          6.5
        ],
        "caution": [
          5.0,
          6.8
        ]
      },
      "lux": {
        "optimal": [
          20000.0,
          45000.0
        ],
        "caution": [
          15000.0,
          50000.0
        ]
      }
    },
    "notes": "Bærvekst som liker kjølig til moderat varme, mye lys og jevn jordfukt.",
    "watering": "Jevnt fuktig jord, ikke la potter tørke helt ut.",
    "seed_guide": {
      "sow": "Start inne vår eller plant som småplante etter behov.",
      "start": "Gi lys, moderat varme og jevn fukt.",
      "repot": "Pottes om når røttene fyller potten.",
      "plant_out": "Settes i drivhus/krukke når veksten er i gang.",
      "harvest": "Følg blomstring/fruktsetting gjennom sesongen."
    },
    "category": "bær",
    "latin_name": "Ribes rubrum"
  },
  {
    "id": "romaine_lettuce",
    "kind": "base",
    "profile_id": "romaine_lettuce",
    "variant_id": null,
    "cultivar_id": null,
    "name": "romanosalat",
    "display_name": "romanosalat",
    "subtitle": "bladgrønt",
    "family": "bladgrønt",
    "icon": "🥬",
    "tone": "leafy",
    "ranges": {
      "airTemperature": {
        "optimal": [
          14.0,
          20.0
        ],
        "caution": [
          6.0,
          24.0
        ]
      },
      "airHumidity": {
        "optimal": [
          60.0,
          75.0
        ],
        "caution": [
          50.0,
          90.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          55.0,
          75.0
        ],
        "caution": [
          45.0,
          85.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          8.0,
          16.0
        ],
        "caution": [
          4.0,
          20.0
        ]
      },
      "ph": {
        "optimal": [
          6.0,
          7.0
        ],
        "caution": [
          5.5,
          7.5
        ]
      },
      "lux": {
        "optimal": [
          12000.0,
          30000.0
        ],
        "caution": [
          8000.0,
          35000.0
        ]
      }
    },
    "notes": "Kjølig til middels varm bladgrønnsak som liker jevn fukt og stabilt klima.",
    "watering": "Jevnt lett fuktig jord, ikke la den tørke helt ut.",
    "seed_guide": {
      "sow": "Så inne eller direkte fra mars-juli.",
      "start": "Kan forkultiveres for jevnere start.",
      "repot": "Pottes/plantes om når småplantene er robuste.",
      "plant_out": "Trives best i kjølig til mildt drivhusklima.",
      "harvest": "Høstes fortløpende eller når hodet er utviklet."
    },
    "category": "grønnsak",
    "latin_name": "Lactuca sativa var. longifolia"
  },
  {
    "id": "rosemary",
    "kind": "base",
    "profile_id": "rosemary",
    "variant_id": null,
    "cultivar_id": null,
    "name": "rosmarin",
    "display_name": "rosmarin",
    "subtitle": "middelhavsurt",
    "family": "middelhavsurt",
    "icon": "🌿",
    "tone": "leafy",
    "ranges": {
      "airTemperature": {
        "optimal": [
          18.0,
          26.0
        ],
        "caution": [
          10.0,
          30.0
        ]
      },
      "airHumidity": {
        "optimal": [
          40.0,
          60.0
        ],
        "caution": [
          30.0,
          70.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          30.0,
          50.0
        ],
        "caution": [
          20.0,
          60.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          16.0,
          22.0
        ],
        "caution": [
          10.0,
          26.0
        ]
      },
      "ph": {
        "optimal": [
          6.5,
          7.5
        ],
        "caution": [
          6.0,
          8.0
        ]
      },
      "lux": {
        "optimal": [
          20000.0,
          50000.0
        ],
        "caution": [
          12000.0,
          60000.0
        ]
      }
    },
    "notes": "Middelhavsurt som liker varm, solrik og tørr plassering med veldrenert jord.",
    "watering": "Sparsom vanning, la jorden tørke godt opp mellom hver gang.",
    "seed_guide": {
      "sow": "Så inne fra mars-mai.",
      "start": "Startes lyst og jevnt fuktig.",
      "repot": "Pottes om når planten har god rotklump.",
      "plant_out": "Kan stå i drivhus, potte eller varm krok.",
      "harvest": "Høstes jevnlig ved å klippe skudd/topper."
    },
    "category": "urt",
    "latin_name": "Salvia rosmarinus"
  },
  {
    "id": "arugula",
    "kind": "base",
    "profile_id": "arugula",
    "variant_id": null,
    "cultivar_id": null,
    "name": "ruccola",
    "display_name": "ruccola",
    "subtitle": "kjølig bladgrønt",
    "family": "kjølig bladgrønt",
    "icon": "🥬",
    "tone": "leafy",
    "ranges": {
      "airTemperature": {
        "optimal": [
          14.0,
          20.0
        ],
        "caution": [
          6.0,
          24.0
        ]
      },
      "airHumidity": {
        "optimal": [
          60.0,
          75.0
        ],
        "caution": [
          50.0,
          90.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          55.0,
          75.0
        ],
        "caution": [
          45.0,
          85.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          8.0,
          16.0
        ],
        "caution": [
          4.0,
          20.0
        ]
      },
      "ph": {
        "optimal": [
          6.0,
          7.0
        ],
        "caution": [
          5.5,
          7.5
        ]
      },
      "lux": {
        "optimal": [
          12000.0,
          30000.0
        ],
        "caution": [
          8000.0,
          35000.0
        ]
      }
    },
    "notes": "Kjølig til middels varm bladgrønnsak som liker jevn fukt og stabilt klima.",
    "watering": "Jevnt lett fuktig jord, ikke la den tørke helt ut.",
    "seed_guide": {
      "sow": "Så inne eller direkte fra mars-juli.",
      "start": "Kan forkultiveres for jevnere start.",
      "repot": "Pottes/plantes om når småplantene er robuste.",
      "plant_out": "Trives best i kjølig til mildt drivhusklima.",
      "harvest": "Høstes fortløpende eller når hodet er utviklet."
    },
    "category": "grønnsak",
    "latin_name": "Eruca sativa"
  },
  {
    "id": "beetroot",
    "kind": "base",
    "profile_id": "beetroot",
    "variant_id": null,
    "cultivar_id": null,
    "name": "rødbete",
    "display_name": "rødbete",
    "subtitle": "rotgrønnsak",
    "family": "rotgrønnsak",
    "icon": "🌱",
    "tone": "leafy",
    "ranges": {
      "airTemperature": {
        "optimal": [
          12.0,
          20.0
        ],
        "caution": [
          6.0,
          24.0
        ]
      },
      "airHumidity": {
        "optimal": [
          60.0,
          75.0
        ],
        "caution": [
          50.0,
          90.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          50.0,
          70.0
        ],
        "caution": [
          40.0,
          80.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          8.0,
          18.0
        ],
        "caution": [
          4.0,
          22.0
        ]
      },
      "ph": {
        "optimal": [
          6.0,
          7.0
        ],
        "caution": [
          5.5,
          7.5
        ]
      },
      "lux": {
        "optimal": [
          12000.0,
          30000.0
        ],
        "caution": [
          8000.0,
          35000.0
        ]
      }
    },
    "notes": "Kjølig til middels varm rotvekst som liker dyp, løs jord og jevn fukt.",
    "watering": "Moderat jevn fukt, ikke vannmettet jord.",
    "seed_guide": {
      "sow": "Så direkte fra april-juni.",
      "start": "Forkultivering er sjelden nødvendig.",
      "repot": "Unngå mye ompotting, røtter liker ro.",
      "plant_out": "Dyrkes direkte i dyp og løs jord.",
      "harvest": "Høstes når røttene har ønsket størrelse."
    },
    "category": "grønnsak",
    "latin_name": "Beta vulgaris"
  },
  {
    "id": "lettuce",
    "kind": "base",
    "profile_id": "lettuce",
    "variant_id": null,
    "cultivar_id": null,
    "name": "salat",
    "display_name": "salat",
    "subtitle": "kjølig bladgrønt",
    "family": "kjølig bladgrønt",
    "icon": "🥬",
    "tone": "leafy",
    "ranges": {
      "airTemperature": {
        "optimal": [
          14.0,
          20.0
        ],
        "caution": [
          6.0,
          24.0
        ]
      },
      "airHumidity": {
        "optimal": [
          60.0,
          75.0
        ],
        "caution": [
          50.0,
          90.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          55.0,
          75.0
        ],
        "caution": [
          45.0,
          85.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          8.0,
          16.0
        ],
        "caution": [
          4.0,
          20.0
        ]
      },
      "ph": {
        "optimal": [
          6.0,
          7.0
        ],
        "caution": [
          5.5,
          7.5
        ]
      },
      "lux": {
        "optimal": [
          12000.0,
          30000.0
        ],
        "caution": [
          8000.0,
          35000.0
        ]
      }
    },
    "notes": "Kjølig til middels varm bladgrønnsak som liker jevn fukt og stabilt klima.",
    "watering": "Jevnt lett fuktig jord, ikke la den tørke helt ut.",
    "seed_guide": {
      "sow": "Så inne eller direkte fra mars-august.",
      "start": "Kan forkultiveres i pluggbrett for tidligere avling.",
      "repot": "Pottes/plantes om når småplantene er håndterbare.",
      "plant_out": "Settes ut/drivhus når jorda er kjølig og fuktig.",
      "harvest": "Høstes fortløpende etter størrelse."
    },
    "category": "grønnsak",
    "latin_name": "Lactuca sativa"
  },
  {
    "id": "sage",
    "kind": "base",
    "profile_id": "sage",
    "variant_id": null,
    "cultivar_id": null,
    "name": "salvie",
    "display_name": "salvie",
    "subtitle": "middelhavsurt",
    "family": "middelhavsurt",
    "icon": "🌱",
    "tone": "leafy",
    "ranges": {
      "airTemperature": {
        "optimal": [
          18.0,
          26.0
        ],
        "caution": [
          10.0,
          30.0
        ]
      },
      "airHumidity": {
        "optimal": [
          40.0,
          60.0
        ],
        "caution": [
          30.0,
          70.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          30.0,
          50.0
        ],
        "caution": [
          20.0,
          60.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          16.0,
          22.0
        ],
        "caution": [
          10.0,
          26.0
        ]
      },
      "ph": {
        "optimal": [
          6.5,
          7.5
        ],
        "caution": [
          6.0,
          8.0
        ]
      },
      "lux": {
        "optimal": [
          20000.0,
          50000.0
        ],
        "caution": [
          12000.0,
          60000.0
        ]
      }
    },
    "notes": "Middelhavsurt som liker varm, solrik og tørr plassering med veldrenert jord.",
    "watering": "Sparsom vanning, la jorden tørke godt opp mellom hver gang.",
    "seed_guide": {
      "sow": "Så inne fra mars-mai.",
      "start": "Startes lyst og jevnt fuktig.",
      "repot": "Pottes om når planten har god rotklump.",
      "plant_out": "Kan stå i drivhus, potte eller varm krok.",
      "harvest": "Høstes jevnlig ved å klippe skudd/topper."
    },
    "category": "urt",
    "latin_name": "Salvia officinalis"
  },
  {
    "id": "celery",
    "kind": "base",
    "profile_id": "celery",
    "variant_id": null,
    "cultivar_id": null,
    "name": "selleri",
    "display_name": "selleri",
    "subtitle": "stilkgrønnsak",
    "family": "stilkgrønnsak",
    "icon": "🌱",
    "tone": "leafy",
    "ranges": {
      "airTemperature": {
        "optimal": [
          16.0,
          22.0
        ],
        "caution": [
          8.0,
          26.0
        ]
      },
      "airHumidity": {
        "optimal": [
          65.0,
          80.0
        ],
        "caution": [
          55.0,
          90.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          65.0,
          80.0
        ],
        "caution": [
          55.0,
          90.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          14.0,
          18.0
        ],
        "caution": [
          8.0,
          22.0
        ]
      },
      "ph": {
        "optimal": [
          6.0,
          7.0
        ],
        "caution": [
          5.8,
          7.5
        ]
      },
      "lux": {
        "optimal": [
          15000.0,
          30000.0
        ],
        "caution": [
          8000.0,
          35000.0
        ]
      }
    },
    "notes": "Stilkvekst som krever jevn høy jordfukt og moderat temperatur.",
    "watering": "Fuktig jord nesten hele tiden, ikke la tørke helt ut.",
    "seed_guide": {
      "sow": "Så inne eller direkte fra mars-juli.",
      "start": "Kan forkultiveres for jevnere start.",
      "repot": "Pottes/plantes om når småplantene er robuste.",
      "plant_out": "Trives best i kjølig til mildt drivhusklima.",
      "harvest": "Høstes fortløpende eller når hodet er utviklet."
    },
    "category": "grønnsak",
    "latin_name": "Apium graveolens"
  },
  {
    "id": "mustard_greens",
    "kind": "base",
    "profile_id": "mustard_greens",
    "variant_id": null,
    "cultivar_id": null,
    "name": "sennepsblader",
    "display_name": "sennepsblader",
    "subtitle": "bladgrønt",
    "family": "bladgrønt",
    "icon": "🌱",
    "tone": "leafy",
    "ranges": {
      "airTemperature": {
        "optimal": [
          14.0,
          20.0
        ],
        "caution": [
          6.0,
          24.0
        ]
      },
      "airHumidity": {
        "optimal": [
          60.0,
          75.0
        ],
        "caution": [
          50.0,
          90.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          55.0,
          75.0
        ],
        "caution": [
          45.0,
          85.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          8.0,
          16.0
        ],
        "caution": [
          4.0,
          20.0
        ]
      },
      "ph": {
        "optimal": [
          6.0,
          7.0
        ],
        "caution": [
          5.5,
          7.5
        ]
      },
      "lux": {
        "optimal": [
          12000.0,
          30000.0
        ],
        "caution": [
          8000.0,
          35000.0
        ]
      }
    },
    "notes": "Kjølig til middels varm bladgrønnsak som liker jevn fukt og stabilt klima.",
    "watering": "Jevnt lett fuktig jord, ikke la den tørke helt ut.",
    "seed_guide": {
      "sow": "Så inne eller direkte fra mars-juli.",
      "start": "Kan forkultiveres for jevnere start.",
      "repot": "Pottes/plantes om når småplantene er robuste.",
      "plant_out": "Trives best i kjølig til mildt drivhusklima.",
      "harvest": "Høstes fortløpende eller når hodet er utviklet."
    },
    "category": "grønnsak",
    "latin_name": "Brassica juncea"
  },
  {
    "id": "lemon_balm",
    "kind": "base",
    "profile_id": "lemon_balm",
    "variant_id": null,
    "cultivar_id": null,
    "name": "sitronmelisse",
    "display_name": "sitronmelisse",
    "subtitle": "flerårig urt",
    "family": "flerårig urt",
    "icon": "🌱",
    "tone": "leafy",
    "ranges": {
      "airTemperature": {
        "optimal": [
          16.0,
          22.0
        ],
        "caution": [
          10.0,
          26.0
        ]
      },
      "airHumidity": {
        "optimal": [
          55.0,
          75.0
        ],
        "caution": [
          45.0,
          85.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          50.0,
          75.0
        ],
        "caution": [
          40.0,
          85.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          14.0,
          20.0
        ],
        "caution": [
          8.0,
          24.0
        ]
      },
      "ph": {
        "optimal": [
          6.0,
          7.0
        ],
        "caution": [
          5.5,
          7.5
        ]
      },
      "lux": {
        "optimal": [
          12000.0,
          30000.0
        ],
        "caution": [
          8000.0,
          35000.0
        ]
      }
    },
    "notes": "Urt som liker moderat varme, god lysmengde og jevnt fuktig jord.",
    "watering": "Jevnt lett fuktig jord, ikke la potten tørke helt ut.",
    "seed_guide": {
      "sow": "Så inne fra mars-mai.",
      "start": "Startes lyst og jevnt fuktig.",
      "repot": "Pottes om når planten har god rotklump.",
      "plant_out": "Kan stå i drivhus, potte eller varm krok.",
      "harvest": "Høstes jevnlig ved å klippe skudd/topper."
    },
    "category": "urt",
    "latin_name": "Melissa officinalis"
  },
  {
    "id": "lemon_verbena",
    "kind": "base",
    "profile_id": "lemon_verbena",
    "variant_id": null,
    "cultivar_id": null,
    "name": "sitronverbena",
    "display_name": "sitronverbena",
    "subtitle": "middelhavsurt",
    "family": "middelhavsurt",
    "icon": "🌱",
    "tone": "leafy",
    "ranges": {
      "airTemperature": {
        "optimal": [
          18.0,
          26.0
        ],
        "caution": [
          10.0,
          30.0
        ]
      },
      "airHumidity": {
        "optimal": [
          40.0,
          60.0
        ],
        "caution": [
          30.0,
          70.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          30.0,
          50.0
        ],
        "caution": [
          20.0,
          60.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          16.0,
          22.0
        ],
        "caution": [
          10.0,
          26.0
        ]
      },
      "ph": {
        "optimal": [
          6.5,
          7.5
        ],
        "caution": [
          6.0,
          8.0
        ]
      },
      "lux": {
        "optimal": [
          20000.0,
          50000.0
        ],
        "caution": [
          12000.0,
          60000.0
        ]
      }
    },
    "notes": "Middelhavsurt som liker varm, solrik og tørr plassering med veldrenert jord.",
    "watering": "Sparsom vanning, la jorden tørke godt opp mellom hver gang.",
    "seed_guide": {
      "sow": "Så inne fra mars-mai.",
      "start": "Startes lyst og jevnt fuktig.",
      "repot": "Pottes om når planten har god rotklump.",
      "plant_out": "Kan stå i drivhus, potte eller varm krok.",
      "harvest": "Høstes jevnlig ved å klippe skudd/topper."
    },
    "category": "urt",
    "latin_name": "Aloysia citrodora"
  },
  {
    "id": "black_currant",
    "kind": "base",
    "profile_id": "black_currant",
    "variant_id": null,
    "cultivar_id": null,
    "name": "solbær",
    "display_name": "solbær",
    "subtitle": "bær busk",
    "family": "bær busk",
    "icon": "🫐",
    "tone": "berry",
    "ranges": {
      "airTemperature": {
        "optimal": [
          16.0,
          22.0
        ],
        "caution": [
          8.0,
          26.0
        ]
      },
      "airHumidity": {
        "optimal": [
          60.0,
          75.0
        ],
        "caution": [
          50.0,
          85.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          55.0,
          75.0
        ],
        "caution": [
          45.0,
          85.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          12.0,
          18.0
        ],
        "caution": [
          8.0,
          22.0
        ]
      },
      "ph": {
        "optimal": [
          5.3,
          6.5
        ],
        "caution": [
          5.0,
          6.8
        ]
      },
      "lux": {
        "optimal": [
          20000.0,
          45000.0
        ],
        "caution": [
          15000.0,
          50000.0
        ]
      }
    },
    "notes": "Bærvekst som liker kjølig til moderat varme, mye lys og jevn jordfukt.",
    "watering": "Jevnt fuktig jord, ikke la potter tørke helt ut.",
    "seed_guide": {
      "sow": "Start inne vår eller plant som småplante etter behov.",
      "start": "Gi lys, moderat varme og jevn fukt.",
      "repot": "Pottes om når røttene fyller potten.",
      "plant_out": "Settes i drivhus/krukke når veksten er i gang.",
      "harvest": "Følg blomstring/fruktsetting gjennom sesongen."
    },
    "category": "bær",
    "latin_name": "Ribes nigrum"
  },
  {
    "id": "spinach",
    "kind": "base",
    "profile_id": "spinach",
    "variant_id": null,
    "cultivar_id": null,
    "name": "spinat",
    "display_name": "spinat",
    "subtitle": "kjølig bladgrønt",
    "family": "kjølig bladgrønt",
    "icon": "🥬",
    "tone": "leafy",
    "ranges": {
      "airTemperature": {
        "optimal": [
          14.0,
          20.0
        ],
        "caution": [
          6.0,
          24.0
        ]
      },
      "airHumidity": {
        "optimal": [
          60.0,
          75.0
        ],
        "caution": [
          50.0,
          90.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          55.0,
          75.0
        ],
        "caution": [
          45.0,
          85.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          8.0,
          16.0
        ],
        "caution": [
          4.0,
          20.0
        ]
      },
      "ph": {
        "optimal": [
          6.0,
          7.0
        ],
        "caution": [
          5.5,
          7.5
        ]
      },
      "lux": {
        "optimal": [
          12000.0,
          30000.0
        ],
        "caution": [
          8000.0,
          35000.0
        ]
      }
    },
    "notes": "Kjølig til middels varm bladgrønnsak som liker jevn fukt og stabilt klima.",
    "watering": "Jevnt lett fuktig jord, ikke la den tørke helt ut.",
    "seed_guide": {
      "sow": "Så inne eller direkte fra mars-juli.",
      "start": "Kan forkultiveres for jevnere start.",
      "repot": "Pottes/plantes om når småplantene er robuste.",
      "plant_out": "Trives best i kjølig til mildt drivhusklima.",
      "harvest": "Høstes fortløpende eller når hodet er utviklet."
    },
    "category": "grønnsak",
    "latin_name": "Spinacia oleracea"
  },
  {
    "id": "squash",
    "kind": "base",
    "profile_id": "squash",
    "variant_id": null,
    "cultivar_id": null,
    "name": "squash",
    "display_name": "squash",
    "subtitle": "varmeelskende fruktgrønnsak",
    "family": "varmeelskende fruktgrønnsak",
    "icon": "🌼",
    "tone": "leafy",
    "ranges": {
      "airTemperature": {
        "optimal": [
          21.0,
          26.0
        ],
        "caution": [
          18.0,
          32.0
        ]
      },
      "airHumidity": {
        "optimal": [
          60.0,
          75.0
        ],
        "caution": [
          50.0,
          85.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          60.0,
          80.0
        ],
        "caution": [
          50.0,
          90.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          18.0,
          22.0
        ],
        "caution": [
          15.0,
          26.0
        ]
      },
      "ph": {
        "optimal": [
          5.8,
          6.8
        ],
        "caution": [
          5.5,
          7.5
        ]
      },
      "lux": {
        "optimal": [
          25000.0,
          60000.0
        ],
        "caution": [
          15000.0,
          70000.0
        ]
      }
    },
    "notes": "Varm og lyselskende drivhusplante som ikke tåler kulde eller langvarig hete.",
    "watering": "Jevnt fuktig jord, ikke la tørke helt ut.",
    "seed_guide": {
      "sow": "Så inne i mars-april.",
      "start": "Forkultiveres inne med varme og godt lys.",
      "repot": "Pottes om når røttene fyller potten.",
      "plant_out": "Flyttes til drivhus fra mai-juni.",
      "harvest": "Høstes når frukt eller blader er modne."
    },
    "category": "grønnsak",
    "latin_name": "Cucurbita pepo"
  },
  {
    "id": "gooseberry",
    "kind": "base",
    "profile_id": "gooseberry",
    "variant_id": null,
    "cultivar_id": null,
    "name": "stikkelsbær",
    "display_name": "stikkelsbær",
    "subtitle": "bær busk",
    "family": "bær busk",
    "icon": "🫐",
    "tone": "berry",
    "ranges": {
      "airTemperature": {
        "optimal": [
          16.0,
          22.0
        ],
        "caution": [
          8.0,
          26.0
        ]
      },
      "airHumidity": {
        "optimal": [
          60.0,
          75.0
        ],
        "caution": [
          50.0,
          85.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          55.0,
          75.0
        ],
        "caution": [
          45.0,
          85.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          12.0,
          18.0
        ],
        "caution": [
          8.0,
          22.0
        ]
      },
      "ph": {
        "optimal": [
          5.3,
          6.5
        ],
        "caution": [
          5.0,
          6.8
        ]
      },
      "lux": {
        "optimal": [
          20000.0,
          45000.0
        ],
        "caution": [
          15000.0,
          50000.0
        ]
      }
    },
    "notes": "Bærvekst som liker kjølig til moderat varme, mye lys og jevn jordfukt.",
    "watering": "Jevnt fuktig jord, ikke la potter tørke helt ut.",
    "seed_guide": {
      "sow": "Start inne vår eller plant som småplante etter behov.",
      "start": "Gi lys, moderat varme og jevn fukt.",
      "repot": "Pottes om når røttene fyller potten.",
      "plant_out": "Settes i drivhus/krukke når veksten er i gang.",
      "harvest": "Følg blomstring/fruktsetting gjennom sesongen."
    },
    "category": "bær",
    "latin_name": "Ribes uva-crispa"
  },
  {
    "id": "pea_sugar",
    "kind": "base",
    "profile_id": "pea_sugar",
    "variant_id": null,
    "cultivar_id": null,
    "name": "sukkererter",
    "display_name": "sukkererter",
    "subtitle": "belgvekst kjølig",
    "family": "belgvekst kjølig",
    "icon": "🌱",
    "tone": "leafy",
    "ranges": {
      "airTemperature": {
        "optimal": [
          14.0,
          22.0
        ],
        "caution": [
          6.0,
          26.0
        ]
      },
      "airHumidity": {
        "optimal": [
          60.0,
          75.0
        ],
        "caution": [
          50.0,
          85.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          55.0,
          75.0
        ],
        "caution": [
          45.0,
          85.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          10.0,
          18.0
        ],
        "caution": [
          5.0,
          22.0
        ]
      },
      "ph": {
        "optimal": [
          6.0,
          7.5
        ],
        "caution": [
          5.8,
          7.8
        ]
      },
      "lux": {
        "optimal": [
          15000.0,
          30000.0
        ],
        "caution": [
          8000.0,
          35000.0
        ]
      }
    },
    "notes": "Belgvekst som trives i kjølig til moderat temperatur og jevnt fuktig jord.",
    "watering": "Moderat jevn fukt, spesielt i blomstring og belging.",
    "seed_guide": {
      "sow": "Så inne eller direkte fra mars-juli.",
      "start": "Kan forkultiveres for jevnere start.",
      "repot": "Pottes/plantes om når småplantene er robuste.",
      "plant_out": "Trives best i kjølig til mildt drivhusklima.",
      "harvest": "Høstes fortløpende eller når hodet er utviklet."
    },
    "category": "grønnsak",
    "latin_name": "Pisum sativum"
  },
  {
    "id": "sweetcorn",
    "kind": "base",
    "profile_id": "sweetcorn",
    "variant_id": null,
    "cultivar_id": null,
    "name": "sukkermais",
    "display_name": "sukkermais",
    "subtitle": "varmeelskende korn",
    "family": "varmeelskende korn",
    "icon": "🌱",
    "tone": "leafy",
    "ranges": {
      "airTemperature": {
        "optimal": [
          21.0,
          26.0
        ],
        "caution": [
          18.0,
          32.0
        ]
      },
      "airHumidity": {
        "optimal": [
          60.0,
          75.0
        ],
        "caution": [
          50.0,
          85.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          60.0,
          80.0
        ],
        "caution": [
          50.0,
          90.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          18.0,
          22.0
        ],
        "caution": [
          15.0,
          26.0
        ]
      },
      "ph": {
        "optimal": [
          5.8,
          6.8
        ],
        "caution": [
          5.5,
          7.5
        ]
      },
      "lux": {
        "optimal": [
          25000.0,
          60000.0
        ],
        "caution": [
          15000.0,
          70000.0
        ]
      }
    },
    "notes": "Varm og lyselskende drivhusplante som ikke tåler kulde eller langvarig hete.",
    "watering": "Jevnt fuktig jord, ikke la tørke helt ut.",
    "seed_guide": {
      "sow": "Så inne i mars-april.",
      "start": "Forkultiveres inne med varme og godt lys.",
      "repot": "Pottes om når røttene fyller potten.",
      "plant_out": "Flyttes til drivhus fra mai-juni.",
      "harvest": "Høstes når frukt eller blader er modne."
    },
    "category": "grønnsak",
    "latin_name": "Zea mays"
  },
  {
    "id": "tagetes",
    "kind": "base",
    "profile_id": "tagetes",
    "variant_id": null,
    "cultivar_id": null,
    "name": "tagetes",
    "display_name": "tagetes",
    "subtitle": "ettårig blomst",
    "family": "ettårig blomst",
    "icon": "🌱",
    "tone": "berry",
    "ranges": {
      "airTemperature": {
        "optimal": [
          18.0,
          24.0
        ],
        "caution": [
          10.0,
          28.0
        ]
      },
      "airHumidity": {
        "optimal": [
          50.0,
          70.0
        ],
        "caution": [
          40.0,
          80.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          45.0,
          70.0
        ],
        "caution": [
          35.0,
          80.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          16.0,
          20.0
        ],
        "caution": [
          10.0,
          24.0
        ]
      },
      "ph": {
        "optimal": [
          6.0,
          7.5
        ],
        "caution": [
          5.5,
          7.8
        ]
      },
      "lux": {
        "optimal": [
          20000.0,
          45000.0
        ],
        "caution": [
          15000.0,
          55000.0
        ]
      }
    },
    "notes": "Sommerblomst for drivhus og potter, liker sol, moderat temperatur og god lufting.",
    "watering": "Moderat vanning, unngå både uttørking og klissvåt jord.",
    "seed_guide": {
      "sow": "Start inne vår eller plant som småplante etter behov.",
      "start": "Gi lys, moderat varme og jevn fukt.",
      "repot": "Pottes om når røttene fyller potten.",
      "plant_out": "Settes i drivhus/krukke når veksten er i gang.",
      "harvest": "Følg blomstring/fruktsetting gjennom sesongen."
    },
    "category": "blomst",
    "latin_name": "Tagetes spp."
  },
  {
    "id": "thyme",
    "kind": "base",
    "profile_id": "thyme",
    "variant_id": null,
    "cultivar_id": null,
    "name": "timian",
    "display_name": "timian",
    "subtitle": "middelhavsurt",
    "family": "middelhavsurt",
    "icon": "🌿",
    "tone": "leafy",
    "ranges": {
      "airTemperature": {
        "optimal": [
          18.0,
          26.0
        ],
        "caution": [
          10.0,
          30.0
        ]
      },
      "airHumidity": {
        "optimal": [
          40.0,
          60.0
        ],
        "caution": [
          30.0,
          70.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          30.0,
          50.0
        ],
        "caution": [
          20.0,
          60.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          16.0,
          22.0
        ],
        "caution": [
          10.0,
          26.0
        ]
      },
      "ph": {
        "optimal": [
          6.5,
          7.5
        ],
        "caution": [
          6.0,
          8.0
        ]
      },
      "lux": {
        "optimal": [
          20000.0,
          50000.0
        ],
        "caution": [
          12000.0,
          60000.0
        ]
      }
    },
    "notes": "Middelhavsurt som liker varm, solrik og tørr plassering med veldrenert jord.",
    "watering": "Sparsom vanning, la jorden tørke godt opp mellom hver gang.",
    "seed_guide": {
      "sow": "Så inne fra mars-mai.",
      "start": "Startes lyst og jevnt fuktig.",
      "repot": "Pottes om når planten har god rotklump.",
      "plant_out": "Kan stå i drivhus, potte eller varm krok.",
      "harvest": "Høstes jevnlig ved å klippe skudd/topper."
    },
    "category": "urt",
    "latin_name": "Thymus vulgaris"
  },
  {
    "id": "tomato",
    "kind": "base",
    "profile_id": "tomato",
    "variant_id": null,
    "cultivar_id": null,
    "name": "tomat",
    "display_name": "tomat",
    "subtitle": "varmeelskende fruktgrønnsak",
    "family": "varmeelskende fruktgrønnsak",
    "icon": "🍅",
    "tone": "tomato",
    "ranges": {
      "airTemperature": {
        "optimal": [
          21.0,
          26.0
        ],
        "caution": [
          18.0,
          32.0
        ]
      },
      "airHumidity": {
        "optimal": [
          60.0,
          75.0
        ],
        "caution": [
          50.0,
          85.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          60.0,
          80.0
        ],
        "caution": [
          50.0,
          90.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          18.0,
          22.0
        ],
        "caution": [
          15.0,
          26.0
        ]
      },
      "ph": {
        "optimal": [
          5.8,
          6.8
        ],
        "caution": [
          5.5,
          7.5
        ]
      },
      "lux": {
        "optimal": [
          25000.0,
          60000.0
        ],
        "caution": [
          15000.0,
          70000.0
        ]
      }
    },
    "notes": "Varm og lyselskende drivhusplante som ikke tåler kulde eller langvarig hete.",
    "watering": "Jevnt fuktig jord, ikke la tørke helt ut.",
    "seed_guide": {
      "sow": "Så inne i mars-april.",
      "start": "Forkultiveres inne lyst og varmt.",
      "repot": "Pottes om når planten har 2-4 varige blad.",
      "plant_out": "Plantes i drivhus fra mai når nettene er stabile.",
      "harvest": "Høstes vanligvis juli-september."
    },
    "category": "grønnsak",
    "latin_name": "Solanum lycopersicum"
  },
  {
    "id": "verbena",
    "kind": "base",
    "profile_id": "verbena",
    "variant_id": null,
    "cultivar_id": null,
    "name": "verbena",
    "display_name": "verbena",
    "subtitle": "ampel/krukke",
    "family": "ampel/krukke",
    "icon": "🌱",
    "tone": "berry",
    "ranges": {
      "airTemperature": {
        "optimal": [
          18.0,
          24.0
        ],
        "caution": [
          10.0,
          28.0
        ]
      },
      "airHumidity": {
        "optimal": [
          50.0,
          70.0
        ],
        "caution": [
          40.0,
          80.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          45.0,
          70.0
        ],
        "caution": [
          35.0,
          80.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          16.0,
          20.0
        ],
        "caution": [
          10.0,
          24.0
        ]
      },
      "ph": {
        "optimal": [
          6.0,
          7.5
        ],
        "caution": [
          5.5,
          7.8
        ]
      },
      "lux": {
        "optimal": [
          20000.0,
          45000.0
        ],
        "caution": [
          15000.0,
          55000.0
        ]
      }
    },
    "notes": "Sommerblomst for drivhus og potter, liker sol, moderat temperatur og god lufting.",
    "watering": "Moderat vanning, unngå både uttørking og klissvåt jord.",
    "seed_guide": {
      "sow": "Start inne vår eller plant som småplante etter behov.",
      "start": "Gi lys, moderat varme og jevn fukt.",
      "repot": "Pottes om når røttene fyller potten.",
      "plant_out": "Settes i drivhus/krukke når veksten er i gang.",
      "harvest": "Følg blomstring/fruktsetting gjennom sesongen."
    },
    "category": "blomst",
    "latin_name": "Verbena x hybrida"
  },
  {
    "id": "spring_onion",
    "kind": "base",
    "profile_id": "spring_onion",
    "variant_id": null,
    "cultivar_id": null,
    "name": "vårløk",
    "display_name": "vårløk",
    "subtitle": "løkvekst",
    "family": "løkvekst",
    "icon": "🌱",
    "tone": "leafy",
    "ranges": {
      "airTemperature": {
        "optimal": [
          14.0,
          22.0
        ],
        "caution": [
          4.0,
          26.0
        ]
      },
      "airHumidity": {
        "optimal": [
          60.0,
          75.0
        ],
        "caution": [
          50.0,
          85.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          50.0,
          70.0
        ],
        "caution": [
          40.0,
          80.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          8.0,
          18.0
        ],
        "caution": [
          4.0,
          22.0
        ]
      },
      "ph": {
        "optimal": [
          6.0,
          7.0
        ],
        "caution": [
          5.5,
          7.8
        ]
      },
      "lux": {
        "optimal": [
          15000.0,
          30000.0
        ],
        "caution": [
          8000.0,
          35000.0
        ]
      }
    },
    "notes": "Kjølig til mild løkvekst som liker veldrenert jord og moderat fukt.",
    "watering": "Moderat fukt, la jorden tørke lett mellom vanning.",
    "seed_guide": {
      "sow": "Så inne eller direkte fra mars-juli.",
      "start": "Kan forkultiveres for jevnere start.",
      "repot": "Pottes/plantes om når småplantene er robuste.",
      "plant_out": "Trives best i kjølig til mildt drivhusklima.",
      "harvest": "Høstes fortløpende eller når hodet er utviklet."
    },
    "category": "grønnsak",
    "latin_name": "Allium fistulosum"
  },
  {
    "id": "zucchini",
    "kind": "base",
    "profile_id": "zucchini",
    "variant_id": null,
    "cultivar_id": null,
    "name": "zucchini",
    "display_name": "zucchini",
    "subtitle": "varmeelskende fruktgrønnsak",
    "family": "varmeelskende fruktgrønnsak",
    "icon": "🌼",
    "tone": "leafy",
    "ranges": {
      "airTemperature": {
        "optimal": [
          21.0,
          26.0
        ],
        "caution": [
          18.0,
          32.0
        ]
      },
      "airHumidity": {
        "optimal": [
          60.0,
          75.0
        ],
        "caution": [
          50.0,
          85.0
        ]
      },
      "soilHumidity": {
        "optimal": [
          60.0,
          80.0
        ],
        "caution": [
          50.0,
          90.0
        ]
      },
      "soilTemperature": {
        "optimal": [
          18.0,
          22.0
        ],
        "caution": [
          15.0,
          26.0
        ]
      },
      "ph": {
        "optimal": [
          5.8,
          6.8
        ],
        "caution": [
          5.5,
          7.5
        ]
      },
      "lux": {
        "optimal": [
          25000.0,
          60000.0
        ],
        "caution": [
          15000.0,
          70000.0
        ]
      }
    },
    "notes": "Varm og lyselskende drivhusplante som ikke tåler kulde eller langvarig hete.",
    "watering": "Jevnt fuktig jord, ikke la tørke helt ut.",
    "seed_guide": {
      "sow": "Så inne i mars-april.",
      "start": "Forkultiveres inne med varme og godt lys.",
      "repot": "Pottes om når røttene fyller potten.",
      "plant_out": "Flyttes til drivhus fra mai-juni.",
      "harvest": "Høstes når frukt eller blader er modne."
    },
    "category": "grønnsak",
    "latin_name": "Cucurbita pepo"
  }
];
