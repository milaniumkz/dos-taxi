final class VehicleCatalog {
  const VehicleCatalog._();

  static const makes = <VehicleMake>[
    VehicleMake('Acura', ['MDX', 'RDX', 'TLX']),
    VehicleMake('Alfa Romeo', ['Giulia', 'Stelvio']),
    VehicleMake('Audi', [
      'A3',
      'A4',
      'A5',
      'A6',
      'A7',
      'A8',
      'Q3',
      'Q5',
      'Q7',
      'Q8',
      'e-tron',
    ]),
    VehicleMake('BMW', [
      '1 Series',
      '2 Series',
      '3 Series',
      '4 Series',
      '5 Series',
      '7 Series',
      'X1',
      'X3',
      'X5',
      'X6',
      'X7',
    ]),
    VehicleMake('BYD', [
      'Atto 3',
      'Dolphin',
      'Han',
      'Seal',
      'Song Plus',
      'Tang',
    ]),
    VehicleMake('Cadillac', ['Escalade', 'XT4', 'XT5', 'XT6']),
    VehicleMake('Changan', [
      'Alsvin',
      'CS35 Plus',
      'CS55 Plus',
      'CS75 Plus',
      'UNI-K',
      'UNI-T',
      'UNI-V',
    ]),
    VehicleMake('Chery', [
      'Arrizo 8',
      'Tiggo 4 Pro',
      'Tiggo 7 Pro',
      'Tiggo 8 Pro',
      'Tiggo 9',
    ]),
    VehicleMake('Chevrolet', [
      'Aveo',
      'Cobalt',
      'Cruze',
      'Lacetti',
      'Malibu',
      'Nexia',
      'Onix',
      'Tracker',
      'Trailblazer',
    ]),
    VehicleMake('Citroen', ['C3', 'C4', 'C5 Aircross', 'Berlingo']),
    VehicleMake('Daewoo', ['Gentra', 'Matiz', 'Nexia']),
    VehicleMake('Datsun', ['mi-DO', 'on-DO']),
    VehicleMake('EXEED', ['LX', 'RX', 'TXL', 'VX']),
    VehicleMake('FAW', [
      'Bestune B70',
      'Bestune T55',
      'Bestune T77',
      'Bestune T99',
    ]),
    VehicleMake('Fiat', ['500', 'Doblo', 'Punto']),
    VehicleMake('Ford', [
      'EcoSport',
      'Escape',
      'Explorer',
      'Fiesta',
      'Focus',
      'Fusion',
      'Kuga',
      'Mondeo',
      'Transit',
    ]),
    VehicleMake('Geely', [
      'Atlas',
      'Atlas Pro',
      'Coolray',
      'Emgrand',
      'Monjaro',
      'Okavango',
      'Tugella',
    ]),
    VehicleMake('Genesis', ['G70', 'G80', 'GV70', 'GV80']),
    VehicleMake('Great Wall', ['Hover H3', 'Hover H5', 'Wingle']),
    VehicleMake('Haval', ['Dargo', 'F7', 'F7x', 'H5', 'H6', 'Jolion', 'M6']),
    VehicleMake('Honda', [
      'Accord',
      'Civic',
      'CR-V',
      'Fit',
      'HR-V',
      'Odyssey',
      'Pilot',
      'Stepwgn',
    ]),
    VehicleMake('Hyundai', [
      'Accent',
      'Avante',
      'Creta',
      'Elantra',
      'Grandeur',
      'i30',
      'Palisade',
      'Santa Fe',
      'Solaris',
      'Sonata',
      'Staria',
      'Tucson',
    ]),
    VehicleMake('Infiniti', ['Q50', 'QX50', 'QX60', 'QX70', 'QX80']),
    VehicleMake('JAC', ['J7', 'JS4', 'JS6', 'S3', 'S5']),
    VehicleMake('Jetour', ['Dashing', 'X70', 'X90 Plus']),
    VehicleMake('Kia', [
      'Carnival',
      'Ceed',
      'Cerato',
      'K5',
      'K7',
      'Optima',
      'Picanto',
      'Rio',
      'Seltos',
      'Sorento',
      'Soul',
      'Sportage',
      'Stinger',
    ]),
    VehicleMake('Lada', [
      'Granta',
      'Kalina',
      'Largus',
      'Niva Legend',
      'Niva Travel',
      'Priora',
      'Vesta',
      'XRAY',
    ]),
    VehicleMake('Land Rover', [
      'Defender',
      'Discovery',
      'Discovery Sport',
      'Range Rover',
      'Range Rover Evoque',
      'Range Rover Sport',
      'Range Rover Velar',
    ]),
    VehicleMake('Lexus', ['ES', 'GX', 'IS', 'LX', 'NX', 'RX', 'UX']),
    VehicleMake('Li Auto', ['L6', 'L7', 'L8', 'L9']),
    VehicleMake('Mazda', [
      '2',
      '3',
      '6',
      'CX-3',
      'CX-30',
      'CX-5',
      'CX-7',
      'CX-9',
    ]),
    VehicleMake('Mercedes-Benz', [
      'A-Class',
      'C-Class',
      'E-Class',
      'G-Class',
      'GLA',
      'GLB',
      'GLC',
      'GLE',
      'GLS',
      'S-Class',
      'Vito',
    ]),
    VehicleMake('Mini', ['Clubman', 'Cooper', 'Countryman']),
    VehicleMake('Mitsubishi', [
      'ASX',
      'Eclipse Cross',
      'Galant',
      'L200',
      'Lancer',
      'Outlander',
      'Pajero',
      'Pajero Sport',
    ]),
    VehicleMake('Nissan', [
      'Almera',
      'Juke',
      'Murano',
      'Pathfinder',
      'Patrol',
      'Qashqai',
      'Sentra',
      'Teana',
      'Terrano',
      'X-Trail',
    ]),
    VehicleMake('Opel', [
      'Astra',
      'Corsa',
      'Insignia',
      'Mokka',
      'Vectra',
      'Zafira',
    ]),
    VehicleMake('Peugeot', [
      '2008',
      '3008',
      '301',
      '307',
      '308',
      '408',
      '508',
      'Partner',
    ]),
    VehicleMake('Porsche', ['Cayenne', 'Macan', 'Panamera', 'Taycan']),
    VehicleMake('Ravon', ['Gentra', 'Nexia R3', 'R2', 'R4']),
    VehicleMake('Renault', [
      'Arkana',
      'Duster',
      'Fluence',
      'Kaptur',
      'Logan',
      'Megane',
      'Sandero',
    ]),
    VehicleMake('Skoda', [
      'Fabia',
      'Karoq',
      'Kodiaq',
      'Octavia',
      'Rapid',
      'Superb',
      'Yeti',
    ]),
    VehicleMake('Subaru', ['Forester', 'Impreza', 'Legacy', 'Outback', 'XV']),
    VehicleMake('Suzuki', ['Grand Vitara', 'Jimny', 'SX4', 'Swift', 'Vitara']),
    VehicleMake('Tesla', ['Model 3', 'Model S', 'Model X', 'Model Y']),
    VehicleMake('Toyota', [
      'Alphard',
      'Avalon',
      'Avensis',
      'Camry',
      'Corolla',
      'Fortuner',
      'Highlander',
      'Land Cruiser 200',
      'Land Cruiser 300',
      'Land Cruiser Prado',
      'Prius',
      'RAV4',
      'Sienna',
      'Yaris',
    ]),
    VehicleMake('Volkswagen', [
      'Golf',
      'Jetta',
      'Passat',
      'Polo',
      'Taos',
      'Teramont',
      'Tiguan',
      'Touareg',
      'Transporter',
    ]),
    VehicleMake('Volvo', ['S60', 'S90', 'XC40', 'XC60', 'XC90']),
    VehicleMake('Zeekr', ['001', '007', '009', 'X']),
  ];

  static const colors = <String>[
    'Белый',
    'Черный',
    'Серый',
    'Серебристый',
    'Синий',
    'Голубой',
    'Красный',
    'Бордовый',
    'Зеленый',
    'Коричневый',
    'Бежевый',
    'Желтый',
    'Оранжевый',
    'Золотой',
  ];

  static List<int> get years {
    final maxYear = DateTime.now().year + 1;
    return [for (var year = maxYear; year >= 1980; year--) year];
  }

  static List<String> modelsFor(String? makeName) {
    for (final make in makes) {
      if (make.name == makeName) {
        return make.models;
      }
    }
    return const [];
  }

  static String? makeValue(String? value) {
    if (value == null || value.trim().isEmpty) {
      return null;
    }
    final normalized = value.trim();
    return makes.any((make) => make.name == normalized) ? normalized : null;
  }

  static String? modelValue(String? makeName, String? value) {
    if (value == null || value.trim().isEmpty) {
      return null;
    }
    final normalized = value.trim();
    return modelsFor(makeName).contains(normalized) ? normalized : null;
  }

  static String? colorValue(String? value) {
    if (value == null || value.trim().isEmpty) {
      return null;
    }
    final normalized = value.trim();
    return colors.contains(normalized) ? normalized : null;
  }
}

final class VehicleMake {
  const VehicleMake(this.name, this.models);

  final String name;
  final List<String> models;
}
