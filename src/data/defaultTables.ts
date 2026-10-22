import { RestaurantTable } from '../types/restaurant';

export const INITIAL_TABLES: RestaurantTable[] = [
  // --- MAIN DINING HALL (Spacious, chandeliers, live jazz acoustic) ---
  {
    id: 'tbl-main-01',
    name: 'T-01 Main',
    section: 'Main Dining Hall',
    capacity: 2,
    minSpend: 250000,
    depositFee: 100000,
    status: 'available',
    description: 'Meja elegan untuk 2 orang di dekat area panggung akustik live musik.',
    features: ['Dekat Live Acoustic', 'Lampu Lilin Hangat', 'Kursi Beludru'],
    imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80',
    x: 25,
    y: 20,
    shape: 'round'
  },
  {
    id: 'tbl-main-02',
    name: 'T-02 Main',
    section: 'Main Dining Hall',
    capacity: 4,
    minSpend: 500000,
    depositFee: 150000,
    status: 'available',
    description: 'Meja bundar di bawah chandelier kristal utama dengan privasi yang nyaman.',
    features: ['Di bawah Chandelier', 'Akses Mudah', 'Stopkontak Meja'],
    imageUrl: 'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=600&q=80',
    x: 45,
    y: 20,
    shape: 'round'
  },
  {
    id: 'tbl-main-03',
    name: 'T-03 Main',
    section: 'Main Dining Hall',
    capacity: 4,
    minSpend: 500000,
    depositFee: 150000,
    status: 'available',
    description: 'Meja makan tengah ruangan yang luas dan nyaman untuk santap bersama kolega.',
    features: ['Suasana Hangat', 'Meja Kayu Mahoni', 'Pelayanan Khusus'],
    imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80',
    x: 65,
    y: 20,
    shape: 'rect'
  },
  {
    id: 'tbl-main-04',
    name: 'T-04 Main',
    section: 'Main Dining Hall',
    capacity: 6,
    minSpend: 750000,
    depositFee: 200000,
    status: 'available',
    description: 'Meja panjang keluarga dengan sofa kulit lembut dan pencahayaan artistik.',
    features: ['Sofa Kulit Empuk', 'Kapasitas 6 Tamu', 'Sangat Nyaman'],
    imageUrl: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=600&q=80',
    x: 45,
    y: 42,
    shape: 'rect'
  },

  // --- ROMANTIC WINDOW BOOTHS (City skyline view, secluded) ---
  {
    id: 'tbl-win-01',
    name: 'W-01 Skyline',
    section: 'Romantic Window Booth',
    capacity: 2,
    minSpend: 400000,
    depositFee: 150000,
    status: 'available',
    description: 'Booth semi-private dengan panorama lampu kota lantai atas yang memukau.',
    features: ['City Skyline View', 'Dekorasi Romantis Bunga', 'Privasi Tinggi'],
    imageUrl: 'https://images.unsplash.com/photo-1578474846511-04ba529f0b88?auto=format&fit=crop&w=600&q=80',
    x: 10,
    y: 18,
    shape: 'booth'
  },
  {
    id: 'tbl-win-02',
    name: 'W-02 Skyline',
    section: 'Romantic Window Booth',
    capacity: 2,
    minSpend: 400000,
    depositFee: 150000,
    status: 'available',
    description: 'Sudut favorit pasangan dengan pemandangan gemerlap kota dan ambient tenang.',
    features: ['Best Sunset / Night View', 'Wine Cooler Stand', 'Ambient Cahaya Redup'],
    imageUrl: 'https://images.unsplash.com/photo-1525610553991-2bede1a236e2?auto=format&fit=crop&w=600&q=80',
    x: 10,
    y: 45,
    shape: 'booth'
  },
  {
    id: 'tbl-win-03',
    name: 'W-03 Skyline',
    section: 'Romantic Window Booth',
    capacity: 4,
    minSpend: 600000,
    depositFee: 200000,
    status: 'available',
    description: 'Booth jendela 4 orang menghadap lanskap jalan protokol metropolitan.',
    features: ['Jendela Panoramik', 'Bantal Duduk Premium', 'Sofa Lengkung'],
    imageUrl: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=600&q=80',
    x: 10,
    y: 72,
    shape: 'booth'
  },

  // --- VIP PRIVATE SUITE (Private dining rooms with dedicated butler) ---
  {
    id: 'tbl-vip-01',
    name: 'VIP-01 Royal Suite',
    section: 'VIP Private Suite',
    capacity: 10,
    minSpend: 2000000,
    depositFee: 500000,
    status: 'available',
    description: 'Ruang privat eksklusif dengan proyektor, sound system, dan pelayan pribadi.',
    features: ['Private Butler', 'Smart Screen 75"', 'Restroom Pribadi', 'Kedap Suara'],
    imageUrl: 'https://images.unsplash.com/photo-1587899897387-091ebd01a6b2?auto=format&fit=crop&w=600&q=80',
    x: 85,
    y: 20,
    shape: 'rect'
  },
  {
    id: 'tbl-vip-02',
    name: 'VIP-02 Emerald Salon',
    section: 'VIP Private Suite',
    capacity: 8,
    minSpend: 1500000,
    depositFee: 400000,
    status: 'available',
    description: 'Ruang perjamuan elegan berkonsep emerald gold, cocok untuk pertemuan bisnis atau lamaran.',
    features: ['AC Eksklusif', 'Wine Cellar Display', 'Pintu Partisi Marmer'],
    imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80',
    x: 85,
    y: 52,
    shape: 'rect'
  },

  // --- GARDEN TERRACE (Outdoor breeze with fairy lights & greenery) ---
  {
    id: 'tbl-gdn-01',
    name: 'G-01 Gazebo',
    section: 'Garden Terrace',
    capacity: 4,
    minSpend: 350000,
    depositFee: 100000,
    status: 'available',
    description: 'Area outdoor teduh dikelilingi tanaman tropis dan air mancur mini.',
    features: ['Suasana Sejuk Terbuka', 'Boleh Merokok / Vape', 'Fairy Lights'],
    imageUrl: 'https://images.unsplash.com/photo-1537047902294-62a40c20a6ae?auto=format&fit=crop&w=600&q=80',
    x: 35,
    y: 75,
    shape: 'round'
  },
  {
    id: 'tbl-gdn-02',
    name: 'G-02 Veranda',
    section: 'Garden Terrace',
    capacity: 6,
    minSpend: 500000,
    depositFee: 150000,
    status: 'available',
    description: 'Meja kayu jati outdoor di beranda taman, cocok untuk kumpul santai sore & malam.',
    features: ['Outdoor Shaded Canopy', 'Lampu Gantung Rustic', 'Pet-Friendly Area'],
    imageUrl: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=600&q=80',
    x: 55,
    y: 75,
    shape: 'rect'
  },

  // --- CHEF'S COUNTER (Interactive tasting experience) ---
  {
    id: 'tbl-chef-01',
    name: 'CT-01 Chef Bar',
    section: 'Chef\'s Counter',
    capacity: 4,
    minSpend: 800000,
    depositFee: 250000,
    status: 'available',
    description: 'Bar counter marmer berhadapan langsung dengan dapur terbuka dan Executive Chef.',
    features: ['Direct Chef Interaction', 'Live Plating Spectacle', 'Pairing Sommelier'],
    imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80',
    x: 75,
    y: 80,
    shape: 'rect'
  }
];

export const TIME_SLOTS = [
  // Lunch Slots
  { time: '11:30', session: 'Lunch', label: '11:30 WIB - Makan Siang' },
  { time: '12:30', session: 'Lunch', label: '12:30 WIB - Makan Siang' },
  { time: '13:30', session: 'Lunch', label: '13:30 WIB - Makan Siang' },
  { time: '14:30', session: 'Lunch', label: '14:30 WIB - Late Lunch' },
  // Dinner Slots
  { time: '17:30', session: 'Dinner', label: '17:30 WIB - Sunset Dinner' },
  { time: '18:30', session: 'Dinner', label: '18:30 WIB - Prime Dinner' },
  { time: '19:30', session: 'Dinner', label: '19:30 WIB - Prime Dinner' },
  { time: '20:30', session: 'Dinner', label: '20:30 WIB - Late Dinner' },
  { time: '21:30', session: 'Dinner', label: '21:30 WIB - Night Lounge' }
];

export const OCCASIONS: { label: string; icon: string }[] = [
  { label: 'Casual Dining', icon: '🍽️' },
  { label: 'Romantic Dinner', icon: '🌹' },
  { label: 'Birthday Celebration', icon: '🎂' },
  { label: 'Wedding Anniversary', icon: '💍' },
  { label: 'Business Dining', icon: '💼' },
  { label: 'Family Gathering', icon: '👨‍👩‍👧‍👦' }
];
