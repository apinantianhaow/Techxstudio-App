import { Hand, Heart, PartyPopper, Pencil, ShoppingBag, Star } from 'lucide-react';

/** Icons for sonner toasts, e.g. toast.success(msg, { icon: toastIcons.cart }). */
export const toastIcons = {
  cart: <ShoppingBag className="w-4 h-4 text-accent" />,
  wishlist: <Heart className="w-4 h-4 fill-danger text-danger" />,
  review: <Star className="w-4 h-4 fill-amber-400 text-amber-400" />,
  celebrate: <PartyPopper className="w-4 h-4 text-accent" />,
  welcome: <Hand className="w-4 h-4 text-accent" />,
  edit: <Pencil className="w-4 h-4 text-accent" />,
};
