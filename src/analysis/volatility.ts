type StampDelta = {
    delta: number,
    remaningStamp: number
}

export class Volatility {
    lastDelta: number;
    deltaHistory: StampDelta[]

    constructor() {
        this.deltaHistory = []
    }

    insertHistory = (delta, remaningStamp) => {
        if (this.deltaHistory.length == 0 || this.lastDelta != delta) {
            this.deltaHistory.push({
                delta,
                remaningStamp
            });
            this.lastDelta = delta
        }
    }

    getVolatility = (remaningStamp: number, delta: number) => {
        const filteredStamps: StampDelta[] = this.deltaHistory
            .filter(deltas => deltas.remaningStamp - remaningStamp <= remaningStamp) // remove unwanted
            .map(deltas => ({
                delta: deltas.delta - delta, // transform
                remaningStamp: deltas.remaningStamp
            }));

        const maxDeltaObject = filteredStamps.reduce((max, deltas) =>
            Math.abs(deltas.delta) > Math.abs(max.delta) ? deltas : max, filteredStamps[0]);

        return maxDeltaObject;
    }

    clearHistory = () => {
        this.deltaHistory = []
    }
}