import Pusher from 'pusher';

const pusherConfig = {
    appId: process.env.PUSHER_APP_ID,
    key: process.env.NEXT_PUBLIC_PUSHER_KEY,
    secret: process.env.PUSHER_SECRET,
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
    useTLS: true,
};

let pusher;

if (!pusherConfig.appId || !pusherConfig.key || !pusherConfig.secret || !pusherConfig.cluster) {
    console.warn('⚠️ Pusher credentials missing. Real-time features will not work.');
    // Mock pusher to prevent server crashes
    pusher = {
        trigger: async (channel, event, data) => {
            console.log(`[Mock Pusher] Triggered '${event}' on '${channel}'`, data);
            return Promise.resolve();
        }
    };
} else {
    pusher = new Pusher(pusherConfig);
}

export default pusher;
