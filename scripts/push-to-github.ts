import { Octokit } from '@octokit/rest';
import { execSync } from 'child_process';
import fs from 'fs';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('GitHub not connected');
  }
  return accessToken;
}

async function pushToGitHub() {
  try {
    console.log('🔐 Obteniendo token de acceso de GitHub...');
    const token = await getAccessToken();
    
    console.log('📦 Configurando credenciales de Git...');
    
    const octokit = new Octokit({ auth: token });
    const { data: user } = await octokit.users.getAuthenticated();
    
    console.log(`✓ Autenticado como: ${user.login}`);
    
    execSync(`git config user.name "${user.name || user.login}"`, { stdio: 'inherit' });
    execSync(`git config user.email "${user.email || `${user.login}@users.noreply.github.com`}"`, { stdio: 'inherit' });
    
    console.log('📤 Subiendo cambios a GitHub...');
    
    const remoteUrl = `https://${token}@github.com/cortsfranco/caroibanezsoft.git`;
    execSync(`git push ${remoteUrl} main`, { stdio: 'inherit' });
    
    console.log('✅ ¡Código subido exitosamente a GitHub!');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

pushToGitHub();
