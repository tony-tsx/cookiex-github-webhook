"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const yargs_1 = __importDefault(require("yargs"));
const fs_1 = __importDefault(require("fs"));
const body_parser_1 = __importDefault(require("body-parser"));
const cors_1 = __importDefault(require("cors"));
const child_process_1 = require("child_process");
const morgan_1 = __importDefault(require("morgan"));
const app = express_1.default();
app.use(morgan_1.default('short'));
app.use(cors_1.default());
app.use(body_parser_1.default.urlencoded({ extended: true }));
app.use(body_parser_1.default.json());
app.all('*', (req, res) => {
    var _a, _b;
    const event = req.headers['X-GitHub-Event'];
    console.log(`Headers: ${Object.keys(req.headers).join(', ')}`);
    if (!event)
        return res.status(301).json({ message: 'Required event from github' });
    console.log(`Receive event ${event}`);
    const body = req.body;
    switch (event) {
        case 'ping': return res.status(204).json({});
        case 'push': {
            if (!fs_1.default.existsSync('config.json'))
                return res.status(306).json({ message: 'Config Json not exists' });
            try {
                const contentConfig = fs_1.default.readFileSync('config.json').toString();
                const config = JSON.parse(contentConfig);
                const repositoryFullName = body.repository.full_name;
                if (Array.isArray(config.repositories)) {
                    const filtred = config.repositories.filter(repository => repository.fullname === repositoryFullName);
                    for (const repository of filtred) {
                        if (!repository.path)
                            continue;
                        const commands = [`cd ${repository.path}`, ...Array.isArray(repository.execute) ? repository.execute : [repository.execute]];
                        try {
                            console.log(`Try execute ${commands.slice(1)} in ${repository.path}`);
                            child_process_1.execSync(commands.join(((_a = config.system) === null || _a === void 0 ? void 0 : _a.commandSeparator) || '&&'));
                        }
                        catch (e) {
                            console.log(`Error in execute commands`);
                            console.log(`Error Message: ${'message' in e ? e.message : typeof e === 'string' ? e : 'No message error'}`);
                            if (repository.error) {
                                console.log(`Execute error command: ${repository.error}`);
                                const command = [`cd ${repository.path}`, repository.error].join(((_b = config.system) === null || _b === void 0 ? void 0 : _b.commandSeparator) || '&&');
                                try {
                                    child_process_1.execSync(command);
                                }
                                catch (_c) {
                                    console.log(`Error command failed`);
                                }
                            }
                        }
                    }
                    return res.status(200).json({});
                }
                else
                    return res.status(301).json({ message: 'Repositories is null or not is array' });
            }
            catch (_d) {
                return res.status(500).json({ message: 'Internal Error' });
            }
        }
        default: return res.status(302).json({ message: 'Method not allowed' });
    }
});
const port = yargs_1.default.argv.port || 8001;
app.listen(port, () => {
    console.log(`Running server in ${port}`);
});
