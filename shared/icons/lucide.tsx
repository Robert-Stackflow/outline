/* eslint-disable */
// AUTO-GENERATED adapter: maps the outline-icons API onto lucide-react.
//
// Aliased from the bare specifier "outline-icons" via vite.config.ts and
// tsconfig.json, so every `import { XxxIcon } from "outline-icons"` across the
// app resolves here without editing call sites. lucide is stroke-based and
// fits the flat/minimal direction. To revert, remove the aliases.
//
// The wrapper normalizes the outline-icons prop shape (size/color) and swallows
// outline-only props (e.g. `expanded`) that lucide does not understand.
import * as React from "react";
import {
  AlignCenter,
  AlignHorizontalDistributeCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  AppWindow,
  Archive,
  ArchiveRestore,
  ArrowDown10,
  ArrowDownAZ,
  ArrowDownToLine,
  ArrowDownZA,
  ArrowLeft,
  ArrowLeftToLine,
  ArrowRight,
  ArrowRightToLine,
  ArrowUp,
  ArrowUp01,
  ArrowUpDown,
  ArrowUpRight,
  ArrowUpToLine,
  Bell,
  BellOff,
  Bike,
  Blocks,
  Bold,
  Book,
  BookLock,
  Bookmark,
  Bug,
  Calendar,
  Camera,
  Car,
  Carrot,
  CaseSensitive,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronUp,
  ChevronsDownUp,
  ChevronsUpDown,
  CircleCheck,
  CircleHelp,
  CircleUser,
  Clock,
  Cloud,
  Code,
  Coins,
  Columns2,
  Copy,
  CopyPlus,
  CornerDownLeft,
  Database,
  Download,
  Dumbbell,
  Ellipsis,
  ExternalLink,
  Eye,
  EyeOff,
  File,
  FilePen,
  FilePlus,
  FileText,
  Flame,
  FlaskConical,
  FormInput,
  Globe,
  GraduationCap,
  Hash,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Highlighter,
  History,
  House,
  IceCreamCone,
  Image,
  Import,
  IndentDecrease,
  IndentIncrease,
  Info,
  Italic,
  Key,
  Keyboard,
  Leaf,
  Library,
  Lightbulb,
  LineChart,
  Link,
  List,
  ListChecks,
  ListOrdered,
  Lock,
  LogOut,
  Mail,
  Maximize2,
  Menu,
  MessageSquare,
  MessageSquareHeart,
  Minimize2,
  Minus,
  Moon,
  Move,
  Notebook,
  Palette,
  PanelLeft,
  Paperclip,
  Pencil,
  Pin,
  Plane,
  Plus,
  Printer,
  Quote,
  Regex,
  Replace,
  Rows2,
  Search,
  Send,
  SeparatorHorizontal,
  Server,
  Settings,
  Shapes,
  Share,
  Share2,
  Shield,
  Shuffle,
  Sigma,
  Smile,
  SmilePlus,
  Soup,
  Sparkles,
  SquareCheck,
  SquareCode,
  Star,
  Strikethrough,
  Sun,
  Table,
  TableCellsMerge,
  TableCellsSplit,
  TableOfContents,
  Target,
  Terminal,
  ThumbsUp,
  Trash2,
  TriangleAlert,
  Truck,
  Undo2,
  Unplug,
  Upload,
  User,
  UserPlus,
  Users,
  Webhook,
  WrapText,
  Wrench,
  X,
  Zap,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

/** Default stroke width (in viewBox units). */
const STROKE_WIDTH = 2;

/**
 * outline-icons drew their glyph with built-in padding (the glyph filled ~75% of
 * the icon box), while lucide fills the whole box. To match the previous optical
 * size WITHOUT changing the layout box, we enlarge the viewBox by this many units
 * on every side — the glyph (drawn in 0..24) then renders smaller inside the same
 * width/height. This keeps `size` meaning the same as before, so every slot,
 * alignment and explicit size (16, 24, 32…) behaves exactly like outline-icons.
 *
 * glyph fraction = 24 / (24 + 2 * GLYPH_PADDING)  → 3 ≈ 80%, 4 ≈ 75%.
 */
const GLYPH_PADDING = 5;
const VIEW_BOX = `${-GLYPH_PADDING} ${-GLYPH_PADDING} ${24 + 2 * GLYPH_PADDING} ${
  24 + 2 * GLYPH_PADDING
}`;

type IconProps = React.SVGAttributes<SVGSVGElement> & {
  /** Pixel size of the square icon. */
  size?: number | string;
  /** Stroke color; defaults to currentColor. */
  color?: string;
  /** Stroke width override. */
  strokeWidth?: number | string;
  /** outline-icons-only prop, swallowed for compatibility. */
  expanded?: boolean;
};

type LucideComponent = React.ForwardRefExoticComponent<
  React.PropsWithoutRef<Record<string, unknown>> &
    React.RefAttributes<SVGSVGElement>
>;

/**
 * Wrap a lucide icon so it accepts the outline-icons prop shape.
 *
 * @param Component the lucide icon component to wrap.
 * @returns a component compatible with outline-icons call sites.
 */
function make(Component: LucideComponent) {
  return React.forwardRef<SVGSVGElement, IconProps>(function OutlineIcon(
    { size = 24, color, strokeWidth, expanded: _expanded, viewBox, ...rest },
    ref
  ) {
    return (
      <Component
        ref={ref}
        size={size}
        color={color}
        strokeWidth={strokeWidth ?? STROKE_WIDTH}
        viewBox={(viewBox as string) ?? VIEW_BOX}
        {...rest}
      />
    );
  });
}

export const AcademicCapIcon = make(GraduationCap);
export const AlignCenterIcon = make(AlignCenter);
export const AlignFullWidthIcon = make(AlignJustify);
export const AlignImageCenterIcon = make(AlignCenter);
export const AlignImageLeftIcon = make(AlignLeft);
export const AlignImageRightIcon = make(AlignRight);
export const AlignLeftIcon = make(AlignLeft);
export const AlignRightIcon = make(AlignRight);
export const ArchiveIcon = make(Archive);
export const ArrowIcon = make(ArrowRight);
export const AttachmentIcon = make(Paperclip);
export const BackIcon = make(ArrowLeft);
export const BeakerIcon = make(FlaskConical);
export const BicycleIcon = make(Bike);
export const BlockQuoteIcon = make(Quote);
export const BoldIcon = make(Bold);
export const BookmarkedIcon = make(Bookmark);
export const BrowserIcon = make(AppWindow);
export const BugIcon = make(Bug);
export const BuildingBlocksIcon = make(Blocks);
export const BulletedListIcon = make(List);
export const CalendarIcon = make(Calendar);
export const CameraIcon = make(Camera);
export const CaretDownIcon = make(ChevronDown);
export const CaretUpIcon = make(ChevronUp);
export const CarrotIcon = make(Carrot);
export const CaseSensitiveIcon = make(CaseSensitive);
export const CheckboxIcon = make(SquareCheck);
export const CheckmarkIcon = make(Check);
export const ClockIcon = make(Clock);
export const CloseIcon = make(X);
export const CloudIcon = make(Cloud);
export const CodeIcon = make(Code);
export const CoinsIcon = make(Coins);
export const CollapseIcon = make(ChevronsDownUp);
export const ExpandIcon = make(ChevronsUpDown);
export const CollapsedIcon = make(ChevronDown);
export const CollectionIcon = make(Book);
export const CommentIcon = make(MessageSquare);
export const CopyIcon = make(Copy);
export const CrossIcon = make(X);
export const DatabaseIcon = make(Database);
export const DisclosureIcon = make(ChevronDown);
export const DisconnectedIcon = make(Unplug);
export const DocumentIcon = make(FileText);
export const DoneIcon = make(CircleCheck);
export const DownloadIcon = make(Download);
export const DraftsIcon = make(FilePen);
export const DuplicateIcon = make(CopyPlus);
export const EditIcon = make(Pencil);
export const EmailIcon = make(Mail);
export const EmbedIcon = make(SquareCode);
export const ExpandedIcon = make(ChevronDown);
export const ExportIcon = make(Upload);
export const EyeIcon = make(Eye);
export const FeedbackIcon = make(MessageSquareHeart);
export const FlameIcon = make(Flame);
export const GlobeIcon = make(Globe);
export const GoToIcon = make(ChevronRight);
export const GraphIcon = make(LineChart);
export const GroupIcon = make(Users);
export const GrowIcon = make(Maximize2);
export const HashtagIcon = make(Hash);
export const Heading1Icon = make(Heading1);
export const Heading2Icon = make(Heading2);
export const Heading3Icon = make(Heading3);
export const Heading4Icon = make(Heading4);
export const HiddenIcon = make(EyeOff);
export const HighlightIcon = make(Highlighter);
export const HistoryIcon = make(History);
export const HomeIcon = make(House);
export const HorizontalRuleIcon = make(Minus);
export const IceCreamIcon = make(IceCreamCone);
export const ImageIcon = make(Image);
export const ImportIcon = make(Import);
export const IndentIcon = make(IndentIncrease);
export const InfoIcon = make(Info);
export const InputIcon = make(FormInput);
export const InsertAboveIcon = make(ArrowUpToLine);
export const InsertBelowIcon = make(ArrowDownToLine);
export const InsertLeftIcon = make(ArrowLeftToLine);
export const InsertRightIcon = make(ArrowRightToLine);
export const InternetIcon = make(Globe);
export const ItalicIcon = make(Italic);
export const KeyIcon = make(Key);
export const KeyboardIcon = make(Keyboard);
export const LeafIcon = make(Leaf);
export const LibraryIcon = make(Library);
export const LightBulbIcon = make(Lightbulb);
export const LightningIcon = make(Zap);
export const LinkIcon = make(Link);
export const LogoutIcon = make(LogOut);
export const MarkAsReadIcon = make(CheckCheck);
export const MathIcon = make(Sigma);
export const MenuIcon = make(Menu);
export const MoonIcon = make(Moon);
export const MoreIcon = make(Ellipsis);
export const MoveIcon = make(Move);
export const NewDocumentIcon = make(FilePlus);
export const NextIcon = make(ChevronRight);
export const NotepadIcon = make(Notebook);
export const OpenIcon = make(ExternalLink);
export const OrderedListIcon = make(ListOrdered);
export const OutdentIcon = make(IndentDecrease);
export const PDFIcon = make(File);
export const PadlockIcon = make(Lock);
export const PageBreakIcon = make(SeparatorHorizontal);
export const PaletteIcon = make(Palette);
export const PinIcon = make(Pin);
export const PlaneIcon = make(Plane);
export const PlusIcon = make(Plus);
export const PrintIcon = make(Printer);
export const PrivateCollectionIcon = make(BookLock);
export const ProfileIcon = make(CircleUser);
export const PromoteIcon = make(ArrowUp);
export const PublishIcon = make(Send);
export const QuestionMarkIcon = make(CircleHelp);
export const RamenIcon = make(Soup);
export const ReactionIcon = make(SmilePlus);
export const RegexIcon = make(Regex);
export const ReplaceIcon = make(Replace);
export const RestoreIcon = make(ArchiveRestore);
export const ReturnIcon = make(CornerDownLeft);
export const SearchIcon = make(Search);
export const ServerRackIcon = make(Server);
export const SettingsIcon = make(Settings);
export const ShapesIcon = make(Shapes);
export const ShareIcon = make(Share2);
export const ShieldIcon = make(Shield);
export const ShrinkIcon = make(Minimize2);
export const ShuffleIcon = make(Shuffle);
export const SidebarIcon = make(ChevronsLeft);
export const SidebarReverseIcon = make(ChevronsRight);
export const SmileyIcon = make(Smile);
export const SortAlphabeticalIcon = make(ArrowDownAZ);
export const SortAlphabeticalReverseIcon = make(ArrowDownZA);
export const SortAscendingIcon = make(ArrowUp01);
export const SortDescendingIcon = make(ArrowDown10);
export const SortManualIcon = make(ArrowUpDown);
export const SparklesIcon = make(Sparkles);
export const SportIcon = make(Dumbbell);
export const StarredIcon = make(Star);
export const StrikethroughIcon = make(Strikethrough);
export const SubscribeIcon = make(Bell);
export const SunIcon = make(Sun);
export const TableColumnsDistributeIcon = make(AlignHorizontalDistributeCenter);
export const TableHeaderColumnIcon = make(Columns2);
export const TableHeaderRowIcon = make(Rows2);
export const TableIcon = make(Table);
export const TableMergeCellsIcon = make(TableCellsMerge);
export const TableOfContentsIcon = make(TableOfContents);
export const TableSplitCellsIcon = make(TableCellsSplit);
export const TargetIcon = make(Target);
export const TeamIcon = make(Users);
export const TerminalIcon = make(Terminal);
export const TextWrapIcon = make(WrapText);
export const ThumbsUpIcon = make(ThumbsUp);
export const TodoListIcon = make(ListChecks);
export const ToolsIcon = make(Wrench);
export const TrashIcon = make(Trash2);
export const TruckIcon = make(Truck);
export const UnpublishIcon = make(Undo2);
export const UnstarredIcon = make(Star);
export const UnsubscribeIcon = make(BellOff);
export const UserIcon = make(User);
export const UserAddIcon = make(UserPlus);
export const VehicleIcon = make(Car);
export const WarningIcon = make(TriangleAlert);
export const WebhooksIcon = make(Webhook);
export const ZoomInIcon = make(ZoomIn);
export const ZoomOutIcon = make(ZoomOut);
