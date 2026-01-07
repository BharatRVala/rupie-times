// src/app/context/CartContext.js
"use client";

import { createContext, useContext, useState, useEffect } from "react";

const CartContext = createContext();

export function CartProvider({ children }) {
    const [cartItems, setCartItems] = useState([]);

    // Load cart from localStorage on mount
    useEffect(() => {
        const savedCart = localStorage.getItem("cart");
        if (savedCart) {
            try {
                setCartItems(JSON.parse(savedCart));
            } catch (e) {
                console.error("Failed to parse cart data", e);
            }
        }
    }, []);

    // Save cart to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem("cart", JSON.stringify(cartItems));
    }, [cartItems]);

    const addToCart = (product) => {
        setCartItems((prevItems) => {
            // Check if item already exists with same ID and duration
            const existingItemIndex = prevItems.findIndex(
                (item) => item.id === product.id && item.duration === product.duration
            );

            if (existingItemIndex > -1) {
                // If exists, maybe update quantity? For now, let's just keep it simple or ignore duplicates if logic requires
                // The user didn't specify quantity logic, but usually "Add to Cart" adds another or increments.
                // Let's assume simple list for now, or maybe just replace/update.
                // Given it's a subscription-like product (duration), maybe just one per type?
                // Let's just add it to the list for now.
                return [...prevItems, product];
            }
            return [...prevItems, product];
        });
    };

    const removeFromCart = (indexToRemove) => {
        setCartItems((prevItems) =>
            prevItems.filter((_, index) => index !== indexToRemove)
        );
    };

    const clearCart = () => {
        setCartItems([]);
    };

    return (
        <CartContext.Provider value={{
            cartItems,
            addToCart,
            removeFromCart,
            clearCart,
            setCart: setCartItems
        }}>
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    return useContext(CartContext);
}
