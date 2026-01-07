"use strict";

import { Suspense } from 'react';
import AddProductContent from './AddProductContent';

import GlobalLoader from '../../../components/GlobalLoader';

export default function AddProductPage() {
    return (
        <Suspense fallback={<GlobalLoader fullScreen={false} className="min-h-[80vh]" />}>
            <AddProductContent />
        </Suspense>
    );
}
