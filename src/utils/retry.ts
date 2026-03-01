export async function retryWithInstantRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    operationName: string = "Operation"
): Promise<T> {
    let lastError: any;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const result = await fn();
            if (attempt > 0) {
                console.log(`✅ ${operationName} succeeded on retry attempt ${attempt}`);
            }
            return result;
        } catch (error: any) {
            lastError = error;

            if (error?.status === 401 || error?.data?.error?.includes("Unauthorized")) {
                throw error;
            }

            if (error?.message?.includes("Cannot") || error?.message?.includes("invalid") || error?.message?.includes("missing")) {
                throw error;
            }
            
            if (attempt < maxRetries) {
                console.log(`🔄 ${operationName} failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying instantly...`);
            } else {
                console.error(`❌ ${operationName} failed after ${maxRetries + 1} attempts`);
            }
        }
    }
    
    throw lastError;
}
