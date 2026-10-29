<?php

const ADMIN_PASSWORD = 'admin123';
const MAX_REQUEST_BYTES = 65536;

function respond($status, $payload) {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function isList($value) {
    return is_array($value) && ($value === [] || array_keys($value) === range(0, count($value) - 1));
}

function cleanItem($item, $isFunction, $icons, &$error) {
    if (!is_array($item) || !isset($item['title'], $item['url'], $item['icon'])) {
        $error = 'Each entry requires a title, URL, and icon.';
        return null;
    }
    if (!is_string($item['title']) || !is_string($item['url']) || !is_string($item['icon'])) {
        $error = 'Entry fields have an invalid type.';
        return null;
    }

    $title = trim($item['title']);
    $url = trim($item['url']);
    $description = '';
    $titleLimit = $isFunction ? 40 : 28;

    if ($title === '' || strlen($title) > $titleLimit) {
        $error = 'A title is empty or too long.';
        return null;
    }
    if ($isFunction) {
        if (!isset($item['description']) || !is_string($item['description'])) {
            $error = 'Each business function requires a description.';
            return null;
        }
        $description = trim($item['description']);
        if ($description === '' || strlen($description) > 120) {
            $error = 'A description is empty or too long.';
            return null;
        }
    }

    $scheme = parse_url($url, PHP_URL_SCHEME);
    if (!filter_var($url, FILTER_VALIDATE_URL) || !in_array(strtolower((string) $scheme), ['http', 'https'], true)) {
        $error = 'Every URL must be a valid HTTP or HTTPS address.';
        return null;
    }
    if (!in_array($item['icon'], $icons, true)) {
        $error = 'An unknown icon was supplied.';
        return null;
    }

    return [
        'title' => $title,
        'description' => $description,
        'url' => $url,
        'icon' => $item['icon']
    ];
}

function cleanConfig($config, &$error) {
    if (!is_array($config) || !isset($config['functions'], $config['tasks'])) {
        $error = 'Configuration must contain functions and tasks.';
        return null;
    }
    if (!isList($config['functions']) || count($config['functions']) !== 6 || !isList($config['tasks']) || count($config['tasks']) > 4) {
        $error = 'Configuration requires six functions and no more than four tasks.';
        return null;
    }

    $icons = ['wifi', 'pos', 'slides', 'navigation', 'weather', 'flight', 'communications', 'support', 'globe', 'tools', 'link', 'grid', 'cctv', 'server'];
    $clean = ['functions' => [], 'tasks' => []];

    foreach ($config['functions'] as $item) {
        $cleaned = cleanItem($item, true, $icons, $error);
        if ($cleaned === null) return null;
        $clean['functions'][] = $cleaned;
    }
    foreach ($config['tasks'] as $item) {
        $cleaned = cleanItem($item, false, $icons, $error);
        if ($cleaned === null) return null;
        $clean['tasks'][] = $cleaned;
    }
    return $clean;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$configPath = dirname(__DIR__) . '/storage/config.json';

if ($method === 'GET') {
    if (!is_file($configPath) || !is_readable($configPath)) {
        respond(500, ['error' => 'The server configuration is unavailable.']);
    }
    $handle = fopen($configPath, 'rb');
    if ($handle === false) {
        respond(500, ['error' => 'The server configuration could not be read.']);
    }
    if (!flock($handle, LOCK_SH)) {
        fclose($handle);
        respond(500, ['error' => 'The server configuration could not be locked for reading.']);
    }
    $contents = stream_get_contents($handle);
    flock($handle, LOCK_UN);
    fclose($handle);
    $config = json_decode((string) $contents, true);
    if (!is_array($config)) {
        respond(500, ['error' => 'The server configuration contains invalid JSON.']);
    }
    respond(200, $config);
}

if ($method !== 'POST') {
    header('Allow: GET, POST');
    respond(405, ['error' => 'Method not allowed.']);
}

$raw = file_get_contents('php://input', false, null, 0, MAX_REQUEST_BYTES + 1);
if ($raw === false || strlen($raw) > MAX_REQUEST_BYTES) {
    respond(413, ['error' => 'The request is too large.']);
}
$payload = json_decode($raw, true);
if (!is_array($payload)) {
    respond(400, ['error' => 'The request contains invalid JSON.']);
}
$password = $payload['password'] ?? '';
if (!is_string($password) || !hash_equals(ADMIN_PASSWORD, $password)) {
    respond(401, ['error' => 'Incorrect administrator password.']);
}

$action = $payload['action'] ?? '';
if ($action === 'authenticate') {
    respond(200, ['ok' => true]);
}
if ($action !== 'save') {
    respond(400, ['error' => 'Unknown action.']);
}

$error = '';
$config = cleanConfig($payload['config'] ?? null, $error);
if ($config === null) {
    respond(422, ['error' => $error]);
}

$json = json_encode($config, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
$directory = dirname($configPath);
if ($json === false || !is_dir($directory) || !is_writable($directory)) {
    respond(500, ['error' => 'The server storage directory is not writable.']);
}
$tempPath = tempnam($directory, 'config-');
if ($tempPath === false) {
    respond(500, ['error' => 'A temporary configuration file could not be created.']);
}
$written = file_put_contents($tempPath, $json . PHP_EOL, LOCK_EX);
if ($written === false || $written !== strlen($json . PHP_EOL)) {
    unlink($tempPath);
    respond(500, ['error' => 'The configuration could not be written.']);
}
chmod($tempPath, 0664);
if (!rename($tempPath, $configPath)) {
    unlink($tempPath);
    respond(500, ['error' => 'The configuration could not be replaced.']);
}

respond(200, ['ok' => true, 'config' => $config]);
