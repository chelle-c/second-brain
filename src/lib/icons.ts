import {
	Accessibility,
	AlertCircle,
	Apple,
	Archive,
	Baby,
	Banknote,
	Battery,
	Beer,
	Bell,
	Bike,
	Bird,
	Bookmark,
	BookOpen,
	Box,
	Brain,
	Briefcase,
	Bug,
	Building,
	Building2,
	Calendar,
	Camera,
	Car,
	Cake,
	Cat,
	CheckCircle,
	Cherry,
	Church,
	Circle,
	Clapperboard,
	Clock,
	Club,
	Code,
	Coffee,
	Coins,
	Compass,
	Crown,
	CupSoda,
	Diamond,
	Dice1,
	Dice2,
	Dice3,
	Dice4,
	Dice5,
	Dice6,
	Dog,
	Dumbbell,
	Edit3,
	Egg,
	Eye,
	FileText,
	Fish,
	Flag,
	Flame,
	Flower,
	Flower2,
	Folder,
	Frown,
	Gamepad2,
	Gem,
	Gift,
	Glasses,
	Globe,
	Grape,
	Guitar,
	Hammer,
	Hand,
	HandMetal,
	Headphones,
	Heart,
	HeartHandshake,
	Home,
	Key,
	Landmark,
	Leaf,
	Lightbulb,
	Link,
	List,
	Lock,
	LockOpen,
	Mail,
	Map as MapIcon,
	MapPin,
	Meh,
	MessageCircle,
	Moon,
	Mountain,
	Music,
	Paintbrush,
	Palette,
	Paperclip,
	Phone,
	Pizza,
	Plane,
	Play,
	Plug,
	Package,
	Rabbit,
	Sandwich,
	Scissors,
	Settings,
	Shield,
	Ship,
	Smile,
	SmilePlus,
	Snail,
	Spade,
	Sparkles,
	Sprout,
	Square,
	Star,
	Sun,
	Tag as TagIcon,
	Target,
	Tent,
	Thermometer,
	TreePine,
	Trees,
	Triangle,
	Trophy,
	Truck,
	Turtle,
	Umbrella,
	User,
	Users,
	Utensils,
	WalletCards,
	Watch,
	Wine,
	Wrench,
	Zap,
	type LucideIcon,
} from "lucide-react";
import React from "react";

// ── Types ────────────────────────────────────────────────────────────────────

export interface IconOption {
	icon: LucideIcon;
	name: string;
	keywords: string[];
}

export interface IconCategory {
	id: string;
	label: string;
	navIcon: string;
	items: IconOption[];
}

export interface EmojiData {
	char: string;
	name: string;
	keywords: string[];
}

export interface EmojiCategory {
	id: string;
	label: string;
	navIcon: string;
	items: EmojiData[];
}

export type IconPickerSelection =
	| { type: "icon"; icon: LucideIcon; name: string }
	| { type: "emoji"; emoji: string };

// ── Default Icons ────────────────────────────────────────────────────────────

export const DEFAULT_TAG_ICON = TagIcon;
export const DEFAULT_FOLDER_ICON = Folder;
export const DEFAULT_NOTE_ICON = FileText;

// ── Icon Categories ──────────────────────────────────────────────────────────

export const ICON_CATEGORIES: IconCategory[] = [
	{
		id: "people",
		label: "People",
		navIcon: "👤",
		items: [
			{ icon: User, name: "User", keywords: ["person", "account", "profile"] },
			{ icon: Users, name: "Users", keywords: ["people", "group", "team"] },
			{ icon: Baby, name: "Baby", keywords: ["child", "infant", "kid"] },
			{ icon: Smile, name: "Smile", keywords: ["happy", "face", "emoji"] },
			{ icon: SmilePlus, name: "SmilePlus", keywords: ["happy", "add", "positive"] },
			{ icon: Frown, name: "Frown", keywords: ["sad", "unhappy", "face"] },
			{ icon: Meh, name: "Meh", keywords: ["neutral", "indifferent", "face"] },
			{ icon: Heart, name: "Heart", keywords: ["love", "like", "favorite"] },
			{ icon: HeartHandshake, name: "HeartHandshake", keywords: ["care", "support", "help"] },
			{ icon: Hand, name: "Hand", keywords: ["stop", "wave", "palm"] },
			{ icon: HandMetal, name: "HandMetal", keywords: ["rock", "metal", "gesture"] },
			{ icon: Eye, name: "Eye", keywords: ["view", "see", "watch", "vision"] },
			{ icon: Brain, name: "Brain", keywords: ["mind", "think", "intelligence"] },
			{
				icon: Accessibility,
				name: "Accessibility",
				keywords: ["disabled", "wheelchair", "access"],
			},
			{ icon: MessageCircle, name: "MessageCircle", keywords: ["chat", "comment", "talk"] },
			{ icon: Glasses, name: "Glasses", keywords: ["eyewear", "read", "vision"] },
		],
	},
	{
		id: "nature",
		label: "Plants and Animals",
		navIcon: "🌿",
		items: [
			{ icon: Leaf, name: "Leaf", keywords: ["plant", "nature", "eco", "green"] },
			{ icon: TreePine, name: "TreePine", keywords: ["forest", "christmas", "evergreen"] },
			{ icon: Trees, name: "Trees", keywords: ["forest", "woods", "nature"] },
			{ icon: Flower, name: "Flower", keywords: ["plant", "garden", "bloom"] },
			{ icon: Flower2, name: "Flower2", keywords: ["plant", "garden", "blossom"] },
			{ icon: Sprout, name: "Sprout", keywords: ["grow", "seed", "plant"] },
			{ icon: Bug, name: "Bug", keywords: ["insect", "beetle", "debug"] },
			{ icon: Fish, name: "Fish", keywords: ["sea", "ocean", "aquarium"] },
			{ icon: Bird, name: "Bird", keywords: ["animal", "fly", "tweet"] },
			{ icon: Cat, name: "Cat", keywords: ["pet", "animal", "kitten"] },
			{ icon: Dog, name: "Dog", keywords: ["pet", "animal", "puppy"] },
			{ icon: Rabbit, name: "Rabbit", keywords: ["bunny", "animal", "pet"] },
			{ icon: Turtle, name: "Turtle", keywords: ["slow", "animal", "shell"] },
			{ icon: Snail, name: "Snail", keywords: ["slow", "shell", "garden"] },
			{ icon: Sun, name: "Sun", keywords: ["day", "light", "weather", "bright"] },
			{ icon: Moon, name: "Moon", keywords: ["night", "dark", "sleep"] },
			{ icon: Flame, name: "Flame", keywords: ["fire", "hot", "burn"] },
			{ icon: Zap, name: "Zap", keywords: ["lightning", "electric", "power", "fast"] },
		],
	},
	{
		id: "food",
		label: "Food and Beverages",
		navIcon: "🍕",
		items: [
			{ icon: Coffee, name: "Coffee", keywords: ["drink", "cafe", "morning", "cup"] },
			{ icon: CupSoda, name: "CupSoda", keywords: ["drink", "soda", "beverage"] },
			{ icon: Wine, name: "Wine", keywords: ["drink", "alcohol", "glass"] },
			{ icon: Beer, name: "Beer", keywords: ["drink", "alcohol", "mug"] },
			{ icon: Apple, name: "Apple", keywords: ["fruit", "food", "healthy"] },
			{ icon: Cherry, name: "Cherry", keywords: ["fruit", "food", "berry"] },
			{ icon: Grape, name: "Grape", keywords: ["fruit", "food", "wine"] },
			{ icon: Pizza, name: "Pizza", keywords: ["food", "italian", "slice"] },
			{ icon: Sandwich, name: "Sandwich", keywords: ["food", "lunch", "bread"] },
			{ icon: Egg, name: "Egg", keywords: ["food", "breakfast", "chicken"] },
			{ icon: Cake, name: "Cake", keywords: ["dessert", "birthday", "sweet"] },
			{ icon: Utensils, name: "Utensils", keywords: ["food", "eat", "restaurant", "dining"] },
			{ icon: Coins, name: "Coins", keywords: ["money", "currency", "payment"] },
		],
	},
	{
		id: "activities",
		label: "Activities",
		navIcon: "⚽",
		items: [
			{
				icon: Gamepad2,
				name: "Gamepad2",
				keywords: ["game", "play", "controller", "gaming"],
			},
			{
				icon: Dumbbell,
				name: "Dumbbell",
				keywords: ["gym", "fitness", "exercise", "workout"],
			},
			{ icon: Trophy, name: "Trophy", keywords: ["win", "award", "champion", "prize"] },
			{ icon: Bike, name: "Bike", keywords: ["bicycle", "cycle", "ride", "exercise"] },
			{ icon: Music, name: "Music", keywords: ["song", "audio", "sound", "note"] },
			{ icon: Guitar, name: "Guitar", keywords: ["music", "instrument", "play"] },
			{ icon: Headphones, name: "Headphones", keywords: ["music", "audio", "listen"] },
			{ icon: Camera, name: "Camera", keywords: ["photo", "picture", "image"] },
			{ icon: Clapperboard, name: "Clapperboard", keywords: ["movie", "film", "video"] },
			{ icon: Palette, name: "Palette", keywords: ["art", "color", "paint", "design"] },
			{ icon: Paintbrush, name: "Paintbrush", keywords: ["art", "paint", "draw"] },
			{ icon: Play, name: "Play", keywords: ["video", "media", "start"] },
			{ icon: Dice1, name: "Dice1", keywords: ["game", "random", "chance"] },
			{ icon: Dice2, name: "Dice2", keywords: ["game", "random", "chance"] },
			{ icon: Dice3, name: "Dice3", keywords: ["game", "random", "chance"] },
			{ icon: Dice4, name: "Dice4", keywords: ["game", "random", "chance"] },
			{ icon: Dice5, name: "Dice5", keywords: ["game", "random", "chance"] },
			{ icon: Dice6, name: "Dice6", keywords: ["game", "random", "chance"] },
			{ icon: Tent, name: "Tent", keywords: ["camping", "outdoor", "adventure"] },
			{ icon: Target, name: "Target", keywords: ["goal", "aim", "focus"] },
		],
	},
	{
		id: "travel",
		label: "Travel and Locations",
		navIcon: "✈️",
		items: [
			{ icon: MapPin, name: "MapPin", keywords: ["location", "place", "marker"] },
			{ icon: MapIcon, name: "Map", keywords: ["location", "navigation", "directions"] },
			{ icon: Globe, name: "Globe", keywords: ["world", "earth", "international"] },
			{ icon: Compass, name: "Compass", keywords: ["direction", "navigation", "north"] },
			{ icon: Plane, name: "Plane", keywords: ["flight", "travel", "airplane", "airport"] },
			{ icon: Car, name: "Car", keywords: ["vehicle", "drive", "auto"] },
			{ icon: Ship, name: "Ship", keywords: ["boat", "sea", "cruise"] },
			{ icon: Truck, name: "Truck", keywords: ["delivery", "vehicle", "transport"] },
			{ icon: Home, name: "Home", keywords: ["house", "residence", "main"] },
			{ icon: Building, name: "Building", keywords: ["office", "company", "work"] },
			{ icon: Building2, name: "Building2", keywords: ["office", "city", "urban"] },
			{ icon: Church, name: "Church", keywords: ["religion", "worship", "building"] },
			{ icon: Landmark, name: "Landmark", keywords: ["monument", "building", "bank"] },
			{ icon: Mountain, name: "Mountain", keywords: ["nature", "hiking", "peak"] },
		],
	},
	{
		id: "objects",
		label: "Objects and Symbols",
		navIcon: "🔑",
		items: [
			{ icon: Key, name: "Key", keywords: ["lock", "security", "access", "password"] },
			{ icon: Lock, name: "Lock", keywords: ["security", "private", "closed"] },
			{ icon: LockOpen, name: "LockOpen", keywords: ["unlock", "open", "access"] },
			{ icon: Lightbulb, name: "Lightbulb", keywords: ["idea", "light", "bright", "think"] },
			{ icon: Battery, name: "Battery", keywords: ["power", "energy", "charge"] },
			{ icon: Plug, name: "Plug", keywords: ["power", "electric", "connect"] },
			{ icon: Phone, name: "Phone", keywords: ["call", "mobile", "contact"] },
			{ icon: Mail, name: "Mail", keywords: ["email", "message", "letter"] },
			{ icon: Package, name: "Package", keywords: ["box", "delivery", "shipping"] },
			{ icon: Gift, name: "Gift", keywords: ["present", "surprise", "birthday"] },
			{ icon: Scissors, name: "Scissors", keywords: ["cut", "tool", "craft"] },
			{ icon: Wrench, name: "Wrench", keywords: ["tool", "fix", "repair", "settings"] },
			{ icon: Hammer, name: "Hammer", keywords: ["tool", "build", "construct"] },
			{ icon: Shield, name: "Shield", keywords: ["security", "protect", "safe"] },
			{ icon: Crown, name: "Crown", keywords: ["king", "queen", "royal", "premium"] },
			{ icon: Gem, name: "Gem", keywords: ["diamond", "jewel", "precious"] },
			{ icon: Diamond, name: "Diamond", keywords: ["jewel", "precious", "card"] },
			{ icon: Star, name: "Star", keywords: ["favorite", "rating", "important"] },
			{ icon: Bookmark, name: "Bookmark", keywords: ["save", "favorite", "mark"] },
			{ icon: Flag, name: "Flag", keywords: ["mark", "report", "country"] },
			{ icon: TagIcon, name: "Tag", keywords: ["label", "category", "price"] },
			{ icon: Folder, name: "Folder", keywords: ["directory", "file", "organize"] },
			{ icon: FileText, name: "FileText", keywords: ["document", "note", "text"] },
			{ icon: Paperclip, name: "Paperclip", keywords: ["attach", "attachment", "file"] },
			{ icon: Link, name: "Link", keywords: ["url", "chain", "connect"] },
			{ icon: Briefcase, name: "Briefcase", keywords: ["work", "business", "job"] },
			{ icon: Box, name: "Box", keywords: ["package", "container", "storage"] },
			{ icon: Bell, name: "Bell", keywords: ["notification", "alert", "ring"] },
			{ icon: Archive, name: "Archive", keywords: ["storage", "old", "backup"] },
			{ icon: Umbrella, name: "Umbrella", keywords: ["rain", "weather", "protect"] },
			{ icon: Watch, name: "Watch", keywords: ["time", "clock", "wrist"] },
			{
				icon: Thermometer,
				name: "Thermometer",
				keywords: ["temperature", "weather", "health"],
			},
			{ icon: Banknote, name: "Banknote", keywords: ["money", "cash", "payment"] },
			{ icon: WalletCards, name: "WalletCards", keywords: ["payment", "credit", "money"] },
			{ icon: Sparkles, name: "Sparkles", keywords: ["magic", "new", "special", "ai"] },
			{ icon: CheckCircle, name: "CheckCircle", keywords: ["done", "complete", "success"] },
			{ icon: AlertCircle, name: "AlertCircle", keywords: ["warning", "error", "attention"] },
			{ icon: BookOpen, name: "BookOpen", keywords: ["read", "study", "learn"] },
			{ icon: Edit3, name: "Edit3", keywords: ["write", "pencil", "modify"] },
			{ icon: Code, name: "Code", keywords: ["programming", "developer", "html"] },
			{ icon: List, name: "List", keywords: ["items", "todo", "bullets"] },
			{ icon: Calendar, name: "Calendar", keywords: ["date", "schedule", "event"] },
			{ icon: Clock, name: "Clock", keywords: ["time", "schedule", "hour"] },
			{ icon: Settings, name: "Settings", keywords: ["gear", "config", "options"] },
			{ icon: Circle, name: "Circle", keywords: ["shape", "round", "dot"] },
			{ icon: Square, name: "Square", keywords: ["shape", "box", "rectangle"] },
			{ icon: Triangle, name: "Triangle", keywords: ["shape", "arrow", "warning"] },
			{ icon: Club, name: "Club", keywords: ["card", "game", "clover"] },
			{ icon: Spade, name: "Spade", keywords: ["card", "game", "dig"] },
		],
	},
];

// ── Emoji Categories ─────────────────────────────────────────────────────────

export const EMOJI_CATEGORIES: EmojiCategory[] = [
	{
		id: "people",
		label: "People",
		navIcon: "😀",
		items: [
			{ char: "😀", name: "grinning", keywords: ["smile", "happy", "face"] },
			{ char: "😃", name: "smiley", keywords: ["smile", "happy", "joy"] },
			{ char: "😄", name: "smile", keywords: ["happy", "joy", "laugh"] },
			{ char: "😁", name: "grin", keywords: ["smile", "happy", "teeth"] },
			{ char: "😆", name: "laughing", keywords: ["happy", "haha", "lol"] },
			{ char: "😅", name: "sweat smile", keywords: ["nervous", "relief"] },
			{ char: "🤣", name: "rofl", keywords: ["laugh", "funny", "lol"] },
			{ char: "😂", name: "joy", keywords: ["laugh", "cry", "happy"] },
			{ char: "🙂", name: "slight smile", keywords: ["okay", "fine"] },
			{ char: "😉", name: "wink", keywords: ["flirt", "playful"] },
			{ char: "😊", name: "blush", keywords: ["happy", "shy", "smile"] },
			{ char: "😇", name: "innocent", keywords: ["angel", "halo", "good"] },
			{ char: "🥰", name: "love", keywords: ["hearts", "adore", "crush"] },
			{ char: "😍", name: "heart eyes", keywords: ["love", "crush", "adore"] },
			{ char: "🤩", name: "star struck", keywords: ["wow", "amazing", "excited"] },
			{ char: "😎", name: "sunglasses", keywords: ["cool", "awesome"] },
			{ char: "🤓", name: "nerd", keywords: ["geek", "smart", "glasses"] },
			{ char: "😋", name: "yum", keywords: ["delicious", "tasty", "tongue"] },
			{ char: "😜", name: "wink tongue", keywords: ["playful", "silly", "joke"] },
			{ char: "🤔", name: "thinking", keywords: ["hmm", "wonder", "consider"] },
			{ char: "😏", name: "smirk", keywords: ["suggestive", "sly"] },
			{ char: "😢", name: "cry", keywords: ["sad", "tear", "upset"] },
			{ char: "😭", name: "sob", keywords: ["cry", "sad", "tears"] },
			{ char: "😡", name: "angry", keywords: ["mad", "rage", "furious"] },
			{ char: "🤯", name: "exploding head", keywords: ["mind blown", "shocked"] },
			{ char: "🥳", name: "party", keywords: ["celebrate", "birthday", "happy"] },
			{ char: "😴", name: "sleeping", keywords: ["tired", "zzz", "sleep"] },
			{ char: "🤒", name: "sick", keywords: ["ill", "fever", "thermometer"] },
			{ char: "👶", name: "baby", keywords: ["child", "infant", "kid"] },
			{ char: "👦", name: "boy", keywords: ["child", "kid", "male"] },
			{ char: "👧", name: "girl", keywords: ["child", "kid", "female"] },
			{ char: "👨", name: "man", keywords: ["male", "adult", "guy"] },
			{ char: "👩", name: "woman", keywords: ["female", "adult", "lady"] },
			{ char: "👴", name: "old man", keywords: ["elderly", "grandpa"] },
			{ char: "👵", name: "old woman", keywords: ["elderly", "grandma"] },
			{ char: "👋", name: "wave", keywords: ["hello", "goodbye", "hi"] },
			{ char: "👍", name: "thumbs up", keywords: ["good", "yes", "like", "ok"] },
			{ char: "👎", name: "thumbs down", keywords: ["bad", "no", "dislike"] },
			{ char: "👏", name: "clap", keywords: ["applause", "bravo", "congrats"] },
			{ char: "🙏", name: "pray", keywords: ["please", "thanks", "hope"] },
			{ char: "💪", name: "muscle", keywords: ["strong", "flex", "power"] },
		],
	},
	{
		id: "nature",
		label: "Plants and Animals",
		navIcon: "🌿",
		items: [
			{ char: "🐶", name: "dog", keywords: ["puppy", "pet", "animal"] },
			{ char: "🐱", name: "cat", keywords: ["kitten", "pet", "animal"] },
			{ char: "🐭", name: "mouse", keywords: ["rat", "animal", "rodent"] },
			{ char: "🐹", name: "hamster", keywords: ["pet", "animal", "rodent"] },
			{ char: "🐰", name: "rabbit", keywords: ["bunny", "pet", "animal"] },
			{ char: "🦊", name: "fox", keywords: ["animal", "wild", "clever"] },
			{ char: "🐻", name: "bear", keywords: ["animal", "wild", "teddy"] },
			{ char: "🐼", name: "panda", keywords: ["animal", "bear", "cute"] },
			{ char: "🐨", name: "koala", keywords: ["animal", "australia", "cute"] },
			{ char: "🐯", name: "tiger", keywords: ["animal", "wild", "cat"] },
			{ char: "🦁", name: "lion", keywords: ["animal", "wild", "king"] },
			{ char: "🐮", name: "cow", keywords: ["animal", "farm", "moo"] },
			{ char: "🐷", name: "pig", keywords: ["animal", "farm", "oink"] },
			{ char: "🐸", name: "frog", keywords: ["animal", "toad", "ribbit"] },
			{ char: "🐵", name: "monkey", keywords: ["animal", "ape", "primate"] },
			{ char: "🐔", name: "chicken", keywords: ["animal", "bird", "farm"] },
			{ char: "🐧", name: "penguin", keywords: ["animal", "bird", "cold"] },
			{ char: "🐦", name: "bird", keywords: ["animal", "fly", "tweet"] },
			{ char: "🦋", name: "butterfly", keywords: ["insect", "pretty", "nature"] },
			{ char: "🐛", name: "bug", keywords: ["insect", "caterpillar", "worm"] },
			{ char: "🐝", name: "bee", keywords: ["insect", "honey", "buzz"] },
			{ char: "🐞", name: "ladybug", keywords: ["insect", "beetle", "luck"] },
			{ char: "🐢", name: "turtle", keywords: ["animal", "slow", "shell"] },
			{ char: "🐍", name: "snake", keywords: ["animal", "reptile", "slither"] },
			{ char: "🐙", name: "octopus", keywords: ["animal", "sea", "tentacle"] },
			{ char: "🐟", name: "fish", keywords: ["animal", "sea", "swim"] },
			{ char: "🐬", name: "dolphin", keywords: ["animal", "sea", "smart"] },
			{ char: "🐳", name: "whale", keywords: ["animal", "sea", "big"] },
			{ char: "🌲", name: "evergreen", keywords: ["tree", "pine", "forest"] },
			{ char: "🌳", name: "tree", keywords: ["nature", "forest", "green"] },
			{ char: "🌴", name: "palm", keywords: ["tree", "tropical", "beach"] },
			{ char: "🌱", name: "seedling", keywords: ["plant", "grow", "sprout"] },
			{ char: "🌿", name: "herb", keywords: ["plant", "leaf", "green"] },
			{ char: "🍀", name: "clover", keywords: ["luck", "irish", "green"] },
			{ char: "🌸", name: "cherry blossom", keywords: ["flower", "spring", "pink"] },
			{ char: "🌹", name: "rose", keywords: ["flower", "love", "red"] },
			{ char: "🌻", name: "sunflower", keywords: ["flower", "sun", "yellow"] },
			{ char: "🌼", name: "blossom", keywords: ["flower", "nature", "bloom"] },
		],
	},
	{
		id: "weather",
		label: "Weather",
		navIcon: "🌤️",
		items: [
			{ char: "☀️", name: "sun", keywords: ["weather", "bright", "day", "hot", "sunny"] },
			{
				char: "🌤️",
				name: "sun small cloud",
				keywords: ["weather", "partly", "cloudy", "fair"],
			},
			{ char: "⛅", name: "sun behind cloud", keywords: ["weather", "partly", "cloudy"] },
			{
				char: "🌥️",
				name: "sun large cloud",
				keywords: ["weather", "mostly", "cloudy", "overcast"],
			},
			{ char: "☁️", name: "cloud", keywords: ["weather", "overcast", "cloudy", "gray"] },
			{ char: "🌦️", name: "sun rain", keywords: ["weather", "shower", "drizzle"] },
			{ char: "🌧️", name: "rain", keywords: ["weather", "cloud", "rainy", "shower"] },
			{ char: "🌨️", name: "snow cloud", keywords: ["weather", "snowy", "cold", "winter"] },
			{ char: "🌩️", name: "lightning cloud", keywords: ["weather", "thunder", "storm"] },
			{
				char: "⛈️",
				name: "thunderstorm",
				keywords: ["weather", "storm", "rain", "lightning"],
			},
			{
				char: "🌪️",
				name: "tornado",
				keywords: ["weather", "storm", "wind", "cyclone", "twister"],
			},
			{ char: "🌫️", name: "fog", keywords: ["weather", "mist", "haze", "smog"] },
			{ char: "🌈", name: "rainbow", keywords: ["weather", "rain", "colorful", "sky"] },
			{ char: "☔", name: "umbrella rain", keywords: ["weather", "rain", "wet", "shower"] },
			{
				char: "❄️",
				name: "snowflake",
				keywords: ["weather", "cold", "winter", "ice", "frozen"],
			},
			{ char: "☃️", name: "snowman", keywords: ["weather", "cold", "winter", "snow"] },
			{ char: "⛄", name: "snowman no snow", keywords: ["weather", "cold", "winter"] },
			{
				char: "🌡️",
				name: "thermometer",
				keywords: ["weather", "temperature", "hot", "cold"],
			},
			{
				char: "🌙",
				name: "crescent moon",
				keywords: ["night", "moon", "dark", "sleep", "sky"],
			},
			{ char: "🌕", name: "full moon", keywords: ["night", "moon", "lunar", "sky"] },
			{ char: "🌑", name: "new moon", keywords: ["night", "moon", "dark", "lunar"] },
			{ char: "⭐", name: "star", keywords: ["night", "sky", "shine", "bright"] },
			{ char: "🌟", name: "glowing star", keywords: ["night", "sparkle", "shine", "bright"] },
			{
				char: "⚡",
				name: "zap",
				keywords: ["lightning", "electric", "thunder", "power", "bolt"],
			},
			{ char: "🔥", name: "fire", keywords: ["hot", "flame", "lit", "burn", "heat"] },
			{ char: "💧", name: "droplet", keywords: ["water", "rain", "tear", "drip"] },
			{ char: "🌊", name: "wave", keywords: ["ocean", "sea", "water", "surf", "tide"] },
			{ char: "💨", name: "wind", keywords: ["blow", "breeze", "air", "gust"] },
		],
	},
	{
		id: "food",
		label: "Food and Beverages",
		navIcon: "🍕",
		items: [
			{ char: "🍎", name: "apple", keywords: ["fruit", "red", "healthy"] },
			{ char: "🍊", name: "orange", keywords: ["fruit", "citrus"] },
			{ char: "🍋", name: "lemon", keywords: ["fruit", "citrus", "sour"] },
			{ char: "🍌", name: "banana", keywords: ["fruit", "yellow"] },
			{ char: "🍉", name: "watermelon", keywords: ["fruit", "summer"] },
			{ char: "🍇", name: "grapes", keywords: ["fruit", "wine", "purple"] },
			{ char: "🍓", name: "strawberry", keywords: ["fruit", "berry", "red"] },
			{ char: "🍒", name: "cherries", keywords: ["fruit", "red"] },
			{ char: "🍑", name: "peach", keywords: ["fruit", "emoji"] },
			{ char: "🥝", name: "kiwi", keywords: ["fruit", "green"] },
			{ char: "🍅", name: "tomato", keywords: ["vegetable", "red"] },
			{ char: "🥑", name: "avocado", keywords: ["vegetable", "green", "guac"] },
			{ char: "🌽", name: "corn", keywords: ["vegetable", "yellow"] },
			{ char: "🥕", name: "carrot", keywords: ["vegetable", "orange"] },
			{ char: "🍞", name: "bread", keywords: ["food", "bakery", "toast"] },
			{ char: "🧀", name: "cheese", keywords: ["food", "dairy"] },
			{ char: "🍳", name: "egg", keywords: ["food", "breakfast", "fried"] },
			{ char: "🥓", name: "bacon", keywords: ["food", "meat", "breakfast"] },
			{ char: "🍔", name: "burger", keywords: ["food", "fast food", "hamburger"] },
			{ char: "🍟", name: "fries", keywords: ["food", "fast food", "potato"] },
			{ char: "🍕", name: "pizza", keywords: ["food", "italian", "slice"] },
			{ char: "🌭", name: "hotdog", keywords: ["food", "sausage"] },
			{ char: "🌮", name: "taco", keywords: ["food", "mexican"] },
			{ char: "🌯", name: "burrito", keywords: ["food", "mexican", "wrap"] },
			{ char: "🍣", name: "sushi", keywords: ["food", "japanese", "fish"] },
			{ char: "🍜", name: "noodles", keywords: ["food", "ramen", "asian"] },
			{ char: "🍝", name: "spaghetti", keywords: ["food", "pasta", "italian"] },
			{ char: "🍰", name: "cake", keywords: ["dessert", "birthday", "sweet"] },
			{ char: "🍩", name: "donut", keywords: ["dessert", "sweet", "breakfast"] },
			{ char: "🍪", name: "cookie", keywords: ["dessert", "sweet", "snack"] },
			{ char: "🍫", name: "chocolate", keywords: ["dessert", "sweet", "candy"] },
			{ char: "🍿", name: "popcorn", keywords: ["snack", "movie", "corn"] },
			{ char: "☕", name: "coffee", keywords: ["drink", "hot", "caffeine"] },
			{ char: "🍵", name: "tea", keywords: ["drink", "hot", "green"] },
			{ char: "🥤", name: "cup", keywords: ["drink", "soda", "straw"] },
			{ char: "🍺", name: "beer", keywords: ["drink", "alcohol", "mug"] },
			{ char: "🍷", name: "wine", keywords: ["drink", "alcohol", "glass"] },
			{ char: "🥂", name: "champagne", keywords: ["drink", "celebrate", "toast"] },
		],
	},
	{
		id: "activities",
		label: "Activities",
		navIcon: "⚽",
		items: [
			{ char: "⚽", name: "soccer", keywords: ["sport", "football", "ball"] },
			{ char: "🏀", name: "basketball", keywords: ["sport", "ball", "nba"] },
			{ char: "🏈", name: "football", keywords: ["sport", "american", "nfl"] },
			{ char: "⚾", name: "baseball", keywords: ["sport", "ball", "mlb"] },
			{ char: "🎾", name: "tennis", keywords: ["sport", "ball", "racket"] },
			{ char: "🏐", name: "volleyball", keywords: ["sport", "ball", "beach"] },
			{ char: "🎱", name: "pool", keywords: ["sport", "billiards", "8ball"] },
			{ char: "🏓", name: "ping pong", keywords: ["sport", "table tennis"] },
			{ char: "🏹", name: "archery", keywords: ["sport", "bow", "arrow"] },
			{ char: "🥊", name: "boxing", keywords: ["sport", "fight", "glove"] },
			{ char: "🎿", name: "skiing", keywords: ["sport", "winter", "snow"] },
			{ char: "🏊", name: "swimming", keywords: ["sport", "pool", "water"] },
			{ char: "🏄", name: "surfing", keywords: ["sport", "wave", "beach"] },
			{ char: "🚴", name: "cycling", keywords: ["sport", "bike", "exercise"] },
			{ char: "🏆", name: "trophy", keywords: ["win", "award", "champion"] },
			{ char: "🥇", name: "gold medal", keywords: ["win", "first", "award"] },
			{ char: "🥈", name: "silver medal", keywords: ["second", "award"] },
			{ char: "🥉", name: "bronze medal", keywords: ["third", "award"] },
			{ char: "🏅", name: "medal", keywords: ["award", "sports", "win"] },
			{ char: "🎪", name: "circus", keywords: ["tent", "show", "carnival"] },
			{ char: "🎭", name: "theater", keywords: ["drama", "masks", "perform"] },
			{ char: "🎨", name: "art", keywords: ["paint", "palette", "creative"] },
			{ char: "🎬", name: "movie", keywords: ["film", "cinema", "clapboard"] },
			{ char: "🎤", name: "microphone", keywords: ["sing", "karaoke", "voice"] },
			{ char: "🎧", name: "headphones", keywords: ["music", "audio", "listen"] },
			{ char: "🎼", name: "music", keywords: ["notes", "song", "melody"] },
			{ char: "🎹", name: "piano", keywords: ["music", "keys", "instrument"] },
			{ char: "🥁", name: "drum", keywords: ["music", "beat", "instrument"] },
			{ char: "🎷", name: "saxophone", keywords: ["music", "jazz", "instrument"] },
			{ char: "🎸", name: "guitar", keywords: ["music", "rock", "instrument"] },
			{ char: "🎲", name: "dice", keywords: ["game", "roll", "chance"] },
			{ char: "🎯", name: "dart", keywords: ["target", "aim", "bullseye"] },
			{ char: "🎮", name: "gamepad", keywords: ["video game", "controller", "play"] },
			{ char: "🧩", name: "puzzle", keywords: ["game", "piece", "jigsaw"] },
		],
	},
	{
		id: "travel",
		label: "Travel and Locations",
		navIcon: "✈️",
		items: [
			{ char: "🚗", name: "car", keywords: ["vehicle", "drive", "auto"] },
			{ char: "🚕", name: "taxi", keywords: ["vehicle", "cab", "ride"] },
			{ char: "🚌", name: "bus", keywords: ["vehicle", "transit", "public"] },
			{ char: "🏎️", name: "race car", keywords: ["vehicle", "fast", "speed"] },
			{ char: "🚓", name: "police car", keywords: ["vehicle", "cop", "emergency"] },
			{ char: "🚑", name: "ambulance", keywords: ["vehicle", "emergency", "medical"] },
			{ char: "🚲", name: "bicycle", keywords: ["vehicle", "bike", "ride"] },
			{ char: "🛵", name: "scooter", keywords: ["vehicle", "motor", "ride"] },
			{ char: "✈️", name: "airplane", keywords: ["travel", "fly", "flight"] },
			{ char: "🚀", name: "rocket", keywords: ["space", "launch", "fast"] },
			{ char: "🚁", name: "helicopter", keywords: ["vehicle", "fly", "chopper"] },
			{ char: "🛥️", name: "boat", keywords: ["vehicle", "water", "ship"] },
			{ char: "🏠", name: "house", keywords: ["home", "building", "residence"] },
			{ char: "🏢", name: "office", keywords: ["building", "work", "business"] },
			{ char: "🏥", name: "hospital", keywords: ["building", "medical", "health"] },
			{ char: "🏦", name: "bank", keywords: ["building", "money", "finance"] },
			{ char: "🏪", name: "store", keywords: ["building", "shop", "convenience"] },
			{ char: "🏭", name: "factory", keywords: ["building", "industry", "work"] },
			{ char: "🏰", name: "castle", keywords: ["building", "medieval", "palace"] },
			{ char: "🗼", name: "tower", keywords: ["building", "tokyo", "landmark"] },
			{ char: "⛪", name: "church", keywords: ["building", "religion", "worship"] },
			{ char: "🕌", name: "mosque", keywords: ["building", "religion", "islam"] },
			{ char: "⛺", name: "tent", keywords: ["camping", "outdoor", "camp"] },
			{ char: "🏖️", name: "beach", keywords: ["vacation", "sand", "umbrella"] },
			{ char: "🏔️", name: "mountain", keywords: ["nature", "snow", "peak"] },
			{ char: "⛰️", name: "mountain", keywords: ["nature", "hiking", "peak"] },
			{ char: "🌋", name: "volcano", keywords: ["nature", "lava", "eruption"] },
			{ char: "🌅", name: "sunrise", keywords: ["morning", "sun", "dawn"] },
			{ char: "🌉", name: "bridge", keywords: ["night", "city", "structure"] },
			{ char: "🗻", name: "fuji", keywords: ["mountain", "japan", "snow"] },
		],
	},
	{
		id: "objects",
		label: "Objects and Symbols",
		navIcon: "🔑",
		items: [
			{ char: "⌚", name: "watch", keywords: ["time", "clock", "wrist"] },
			{ char: "📱", name: "phone", keywords: ["mobile", "cell", "smartphone"] },
			{ char: "💻", name: "laptop", keywords: ["computer", "work", "device"] },
			{ char: "🖥️", name: "desktop", keywords: ["computer", "monitor", "screen"] },
			{ char: "📷", name: "camera", keywords: ["photo", "picture", "image"] },
			{ char: "📺", name: "tv", keywords: ["television", "screen", "watch"] },
			{ char: "⏰", name: "alarm", keywords: ["clock", "time", "wake"] },
			{ char: "💡", name: "bulb", keywords: ["light", "idea", "bright"] },
			{ char: "🔋", name: "battery", keywords: ["power", "energy", "charge"] },
			{ char: "🔌", name: "plug", keywords: ["power", "electric", "outlet"] },
			{ char: "🔑", name: "key", keywords: ["lock", "security", "access"] },
			{ char: "🔒", name: "lock", keywords: ["security", "closed", "private"] },
			{ char: "🔓", name: "unlock", keywords: ["open", "security", "access"] },
			{ char: "💰", name: "money bag", keywords: ["rich", "cash", "dollar"] },
			{ char: "💳", name: "credit card", keywords: ["payment", "money", "bank"] },
			{ char: "💎", name: "gem", keywords: ["diamond", "jewel", "precious"] },
			{ char: "🔧", name: "wrench", keywords: ["tool", "fix", "repair"] },
			{ char: "🔨", name: "hammer", keywords: ["tool", "build", "construct"] },
			{ char: "⚙️", name: "gear", keywords: ["settings", "cog", "config"] },
			{ char: "🔗", name: "link", keywords: ["chain", "url", "connect"] },
			{ char: "📧", name: "email", keywords: ["mail", "message", "send"] },
			{ char: "📦", name: "package", keywords: ["box", "delivery", "ship"] },
			{ char: "🎁", name: "gift", keywords: ["present", "birthday", "wrap"] },
			{ char: "✂️", name: "scissors", keywords: ["cut", "tool", "craft"] },
			{ char: "🛡️", name: "shield", keywords: ["protect", "security", "defense"] },
			{ char: "🔔", name: "bell", keywords: ["notification", "alert", "ring"] },
			{ char: "📚", name: "books", keywords: ["read", "study", "library"] },
			{ char: "✏️", name: "pencil", keywords: ["write", "edit", "draw"] },
			{ char: "🔍", name: "search", keywords: ["magnify", "find", "look"] },
			{ char: "❤️", name: "heart", keywords: ["love", "like", "favorite"] },
			{ char: "🧡", name: "orange heart", keywords: ["love", "like"] },
			{ char: "💛", name: "yellow heart", keywords: ["love", "like"] },
			{ char: "💚", name: "green heart", keywords: ["love", "like"] },
			{ char: "💙", name: "blue heart", keywords: ["love", "like"] },
			{ char: "💜", name: "purple heart", keywords: ["love", "like"] },
			{ char: "🖤", name: "black heart", keywords: ["love", "dark"] },
			{ char: "✨", name: "sparkles", keywords: ["magic", "shine", "new"] },
			{ char: "💯", name: "hundred", keywords: ["score", "perfect", "100"] },
			{ char: "✅", name: "check", keywords: ["done", "complete", "yes"] },
			{ char: "❌", name: "x", keywords: ["no", "wrong", "cancel"] },
			{ char: "⭕", name: "circle", keywords: ["ring", "round", "hollow"] },
			{ char: "🚫", name: "prohibited", keywords: ["no", "forbidden", "stop"] },
		],
	},
];

// ── Flat Icon List (for legacy compatibility) ────────────────────────────────

export const AVAILABLE_ICONS: IconOption[] = ICON_CATEGORIES.flatMap((cat) => cat.items);

// ── Icon Lookup Maps ─────────────────────────────────────────────────────────

const ICON_TO_NAME_MAP = new WeakMap<LucideIcon, string>();
const NAME_TO_ICON_MAP = new Map<string, LucideIcon>();

for (const cat of ICON_CATEGORIES) {
	for (const item of cat.items) {
		ICON_TO_NAME_MAP.set(item.icon, item.name);
		NAME_TO_ICON_MAP.set(item.name, item.icon);
	}
}

// Storage-compatible icon map (used by notesStorage.ts)
export const ICON_MAP: Record<string, LucideIcon> = Object.fromEntries(
	AVAILABLE_ICONS.map((item) => [item.name, item.icon]),
);

// ── Helper Functions ─────────────────────────────────────────────────────────

/**
 * Get the name of a Lucide icon component.
 */
export const getIconNameFromComponent = (icon: LucideIcon | undefined): string | null => {
	if (!icon) return null;
	const fromMap = ICON_TO_NAME_MAP.get(icon);
	if (fromMap) return fromMap;
	// Fallback to displayName
	const iconComponent = icon as unknown as { displayName?: string };
	if (iconComponent.displayName) return iconComponent.displayName;
	return null;
};

/**
 * Returns a valid icon component, with fallback.
 */
export const getValidIcon = (
	icon: LucideIcon | undefined,
	fallback: LucideIcon = TagIcon,
): LucideIcon => {
	if (icon && (typeof icon === "function" || typeof icon === "object")) return icon;
	return fallback;
};

/**
 * Find a Lucide icon by its name.
 */
export const findIconByName = (name: string): LucideIcon | undefined => {
	return NAME_TO_ICON_MAP.get(name);
};

/**
 * Returns true when the string contains non-ASCII characters (i.e., is an emoji).
 */
export const isEmojiString = (value: string): boolean => {
	// eslint-disable-next-line no-control-regex
	return /[^\u0000-\u007F]/.test(value);
};

/**
 * Render a note icon value (Lucide icon name OR emoji character) as a React node.
 */
export function renderNoteIcon(
	value: string | null | undefined,
	size: number = 16,
	className?: string,
): React.ReactNode {
	if (!value) return null;
	const lucideIcon = findIconByName(value);
	if (lucideIcon) {
		return React.createElement(lucideIcon, { size, className });
	}
	return React.createElement(
		"span",
		{
			role: "img",
			"aria-hidden": true,
			style: { fontSize: `${size}px`, lineHeight: 1 },
			className,
		},
		value,
	);
}

/**
 * Render a folder/tag icon (LucideIcon component or emoji string) as a React node.
 */
export function renderFolderOrTagIcon(
	icon?: LucideIcon,
	emoji?: string,
	size: number = 16,
	className?: string,
): React.ReactNode {
	if (emoji) {
		return React.createElement(
			"span",
			{
				role: "img",
				"aria-hidden": true,
				style: { fontSize: `${size}px`, lineHeight: 1 },
				className,
			},
			emoji,
		);
	}
	if (icon) {
		return React.createElement(icon, { size, className });
	}
	return null;
}

// ── Emoji prefix for storage ─────────────────────────────────────────────────

export const EMOJI_STORAGE_PREFIX = "emoji:";

/**
 * Serialize a folder/tag icon for storage.
 * Returns icon name or "emoji:X" for emojis.
 */
export function serializeIconField(
	icon: LucideIcon | undefined,
	emoji: string | undefined,
): string | null {
	if (emoji) return `${EMOJI_STORAGE_PREFIX}${emoji}`;
	return getIconNameFromComponent(icon);
}

/**
 * Deserialize a stored icon string into { icon, emoji }.
 */
export function deserializeIconField(raw: string | null | undefined): {
	icon?: LucideIcon;
	emoji?: string;
} {
	if (!raw) return {};
	if (raw.startsWith(EMOJI_STORAGE_PREFIX)) {
		return { emoji: raw.slice(EMOJI_STORAGE_PREFIX.length) };
	}
	const component = ICON_MAP[raw];
	if (component) return { icon: component };
	return {};
}
