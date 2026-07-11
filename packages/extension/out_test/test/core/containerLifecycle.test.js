"use strict";
/**
 * Tests de ContainerLifecycle — con DockerClient mockeado.
 * Estos tests validan la lógica de ciclo de vida sin necesitar Docker real corriendo.
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var assert = require("assert");
var containerLifecycle_1 = require("../../src/core/docker/containerLifecycle");
var engine_types_1 = require("../../src/core/engines/engine.types");
/** Mock de DockerClient que simula Docker disponible y contenedor funcional */
function createSuccessfulDockerMock() {
    var _this = this;
    return {
        checkDockerAvailability: function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
            return [2 /*return*/, (0, engine_types_1.success)(undefined)];
        }); }); },
        pullImage: function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
            return [2 /*return*/, (0, engine_types_1.success)(undefined)];
        }); }); },
        imageExists: function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
            return [2 /*return*/, true];
        }); }); }, // imagen ya existe → no hace pull
        createAndStartContainer: function () { return __awaiter(_this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, (0, engine_types_1.success)({ start: function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/];
                        }); }); }, inspect: function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, ({ State: { Running: true } })];
                        }); }); } })];
            });
        }); },
        stopAndRemoveContainer: function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
            return [2 /*return*/, (0, engine_types_1.success)(undefined)];
        }); }); },
        isContainerRunning: function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
            return [2 /*return*/, true];
        }); }); },
        getContainerByName: function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
            return [2 /*return*/, null];
        }); }); },
    };
}
/** Mock de DockerClient que simula Docker NO disponible */
function createDockerNotRunningMock() {
    var _this = this;
    return {
        checkDockerAvailability: function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, (0, engine_types_1.failure)({
                        code: 'DOCKER_NOT_RUNNING',
                        message: 'Docker no está corriendo',
                    })];
            });
        }); },
        pullImage: function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
            return [2 /*return*/, (0, engine_types_1.success)(undefined)];
        }); }); },
        imageExists: function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
            return [2 /*return*/, false];
        }); }); },
        createAndStartContainer: function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
            return [2 /*return*/, (0, engine_types_1.success)({})];
        }); }); },
        stopAndRemoveContainer: function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
            return [2 /*return*/, (0, engine_types_1.success)(undefined)];
        }); }); },
        isContainerRunning: function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
            return [2 /*return*/, false];
        }); }); },
        getContainerByName: function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
            return [2 /*return*/, null];
        }); }); },
    };
}
suite('ContainerLifecycle', function () {
    test('getStatus inicial es "stopped"', function () {
        var mock = createSuccessfulDockerMock();
        var lifecycle = new containerLifecycle_1.ContainerLifecycle(mock);
        assert.strictEqual(lifecycle.getStatus(), 'stopped');
    });
    test('getCurrentEngine inicial es null', function () {
        var mock = createSuccessfulDockerMock();
        var lifecycle = new containerLifecycle_1.ContainerLifecycle(mock);
        assert.strictEqual(lifecycle.getCurrentEngine(), null);
    });
    test('startEngine con motor inválido retorna error UNKNOWN_ENGINE', function () { return __awaiter(void 0, void 0, void 0, function () {
        var mock, lifecycle, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    mock = createSuccessfulDockerMock();
                    lifecycle = new containerLifecycle_1.ContainerLifecycle(mock);
                    return [4 /*yield*/, lifecycle.startEngine('nonexistent')];
                case 1:
                    result = _a.sent();
                    assert.strictEqual(result.ok, false);
                    if (!result.ok) {
                        assert.strictEqual(result.error.code, 'UNKNOWN_ENGINE');
                    }
                    return [2 /*return*/];
            }
        });
    }); });
    test('startEngine falla si Docker no está corriendo', function () { return __awaiter(void 0, void 0, void 0, function () {
        var mock, lifecycle, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    mock = createDockerNotRunningMock();
                    lifecycle = new containerLifecycle_1.ContainerLifecycle(mock);
                    return [4 /*yield*/, lifecycle.startEngine('postgres')];
                case 1:
                    result = _a.sent();
                    assert.strictEqual(result.ok, false);
                    if (!result.ok) {
                        assert.strictEqual(result.error.code, 'DOCKER_NOT_RUNNING');
                    }
                    return [2 /*return*/];
            }
        });
    }); });
    test('stopEngine cuando no hay motor activo retorna success', function () { return __awaiter(void 0, void 0, void 0, function () {
        var mock, lifecycle, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    mock = createSuccessfulDockerMock();
                    lifecycle = new containerLifecycle_1.ContainerLifecycle(mock);
                    return [4 /*yield*/, lifecycle.stopEngine()];
                case 1:
                    result = _a.sent();
                    assert.strictEqual(result.ok, true);
                    return [2 /*return*/];
            }
        });
    }); });
    test('emite evento statusChanged durante el ciclo de vida', function () { return __awaiter(void 0, void 0, void 0, function () {
        var mock, lifecycle, statusChanges, notRunningMock, lifecycle2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    mock = createSuccessfulDockerMock();
                    lifecycle = new containerLifecycle_1.ContainerLifecycle(mock);
                    statusChanges = [];
                    lifecycle.on('statusChanged', function (state) {
                        statusChanges.push(state.status);
                    });
                    notRunningMock = createDockerNotRunningMock();
                    lifecycle2 = new containerLifecycle_1.ContainerLifecycle(notRunningMock);
                    lifecycle2.on('statusChanged', function (state) {
                        statusChanges.push(state.status);
                    });
                    return [4 /*yield*/, lifecycle2.startEngine('postgres')];
                case 1:
                    _a.sent();
                    assert.ok(statusChanges.includes('pulling') || statusChanges.includes('error'), 'Debe emitir al menos un evento de estado');
                    return [2 /*return*/];
            }
        });
    }); });
    test('Result<T> success tiene ok=true y value', function () {
        var result = (0, engine_types_1.success)(42);
        assert.strictEqual(result.ok, true);
        if (result.ok) {
            assert.strictEqual(result.value, 42);
        }
    });
    test('Result<T> failure tiene ok=false y error', function () {
        var error = { code: 'DOCKER_NOT_RUNNING', message: 'Error de prueba' };
        var result = (0, engine_types_1.failure)(error);
        assert.strictEqual(result.ok, false);
        if (!result.ok) {
            assert.strictEqual(result.error.code, 'DOCKER_NOT_RUNNING');
        }
    });
});
