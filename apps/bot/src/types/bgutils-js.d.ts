declare module 'bgutils-js' {
    export interface BGConfig {
        requestKey: string;
        visitorData?: string;
        reuse?: boolean;
    }

    export interface BGResponse {
        visitorData: string;
    }

    const BgUtils: {
        generate(config: BGConfig): Promise<BGResponse>;
    };

    export default BgUtils;
}
