'use strict';

const LANGUAGES = [
  'Abkhaz', 'Acehnese', 'Acholi', 'Afrikaans', 'Albanian', 'Alur', 'Amharic', 'Arabic',
  'Armenian', 'Assamese', 'Awadhi', 'Aymara', 'Azerbaijani', 'Balinese', 'Bambara', 'Bashkir',
  'Basque', 'Batak Karo', 'Batak Simalungun', 'Batak Toba', 'Belarusian', 'Bemba', 'Bengali',
  'Betawi', 'Bhojpuri', 'Bikol', 'Bosnian', 'Breton', 'Bulgarian', 'Buryat', 'Cantonese',
  'Catalan', 'Cebuano', 'Chichewa (Nyanja)', 'Chinese (Simplified)', 'Chinese (Traditional)',
  'Chuvash', 'Corsican', 'Crimean Tatar', 'Croatian', 'Czech', 'Danish', 'Dinka', 'Divehi',
  'Dogri', 'Dombe', 'Dutch', 'Dzongkha', 'English', 'Esperanto', 'Estonian', 'Ewe', 'Fijian',
  'Filipino (Tagalog)', 'Finnish', 'French', 'French (Canadian)', 'Frisian', 'Fulfulde', 'Ga',
  'Galician', 'Ganda (Luganda)', 'Georgian', 'German', 'Greek', 'Guarani', 'Gujarati',
  'Haitian Creole', 'Hakha Chin', 'Hausa', 'Hawaiian', 'Hebrew', 'Hiligaynon', 'Hindi', 'Hmong',
  'Hungarian', 'Hunsrik', 'Icelandic', 'Igbo', 'Iloko', 'Indonesian', 'Irish', 'Italian',
  'Japanese', 'Javanese', 'Kannada', 'Kapampangan', 'Kazakh', 'Khmer', 'Kiga', 'Kinyarwanda',
  'Kituba', 'Konkani', 'Korean', 'Krio', 'Kurdish (Kurmanji)', 'Kurdish (Sorani)', 'Kyrgyz',
  'Lao', 'Latgalian', 'Latin', 'Latvian', 'Ligurian', 'Limburgan', 'Lingala', 'Lithuanian',
  'Lombard', 'Luo', 'Luxembourgish', 'Macedonian', 'Maithili', 'Makassar', 'Malagasy', 'Malay',
  'Malayalam', 'Maltese', 'Maori', 'Marathi', 'Meadow Mari', 'Meiteilon (Manipuri)', 'Minang',
  'Mizo', 'Mongolian', 'Myanmar (Burmese)', 'Ndebele (South)', 'Nepalbhasa (Newari)', 'Nepali',
  'Northern Sotho (Sepedi)', 'Norwegian', 'Nuer', 'Occitan', 'Odia (Oriya)', 'Oromo',
  'Pangasinan', 'Papiamento', 'Pashto', 'Persian', 'Polish', 'Portuguese', 'Portuguese (Brazil)',
  'Portuguese (Portugal)', 'Punjabi', 'Quechua', 'Romani', 'Romanian', 'Rundi', 'Russian',
  'Samoan', 'Sango', 'Sanskrit', 'Scots Gaelic', 'Serbian', 'Sesotho', 'Seychellois Creole',
  'Shan', 'Shona', 'Sicilian', 'Silesian', 'Sindhi', 'Sinhala', 'Slovak', 'Slovenian', 'Somali',
  'Spanish', 'Sundanese', 'Swahili', 'Swati', 'Swedish', 'Tajik', 'Tamil', 'Tatar', 'Telugu',
  'Tetum', 'Thai', 'Tigrinya', 'Tsonga', 'Tswana', 'Turkish', 'Turkmen', 'Twi (Akan)',
  'Ukrainian', 'Urdu', 'Uyghur', 'Uzbek', 'Vietnamese', 'Welsh', 'Xhosa', 'Yiddish', 'Yoruba',
  'Yucatec Maya', 'Zulu',
];

const AUTO_LANGUAGE = 'auto';
const DEFAULT_FAVORITE_LANGUAGES = ['English'];
