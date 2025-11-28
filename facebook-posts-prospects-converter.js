// Facebook Posts to CRM Prospects Converter
import { readFileSync, writeFileSync } from 'fs';

// Read Facebook posts data
const facebookPosts = readFileSync('C:/Users/Mamado PAYCI/Desktop/New folder (3)/facebook posts data.json', 'utf8');

// Parse the text format - each post starts with a name line
function parseFacebookPosts(text) {
    const posts = [];
    const lines = text.split('\n');
    let currentPost = null;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Skip empty lines and separators
        if (!line || line.startsWith('---') || line.includes('**')) {
            continue;
        }
        
        // Check if this is a name line (starts with a name)
        if (i === 0 || lines[i-1].trim().startsWith('---') || !lines[i-1].trim()) {
            // Save previous post if exists
            if (currentPost) {
                posts.push(currentPost);
            }
            
            // Start new post
            currentPost = {
                name: line,
                content: []
            };
        } else if (currentPost) {
            // Add content to current post
            currentPost.content.push(line);
        }
    }
    
    // Add the last post
    if (currentPost) {
        posts.push(currentPost);
    }
    
    return posts;
}

// Extract information from post content
function extractBusinessInfo(post) {
    const content = post.content.join(' ');
    const info = {
        phones: [],
        emails: [],
        websites: [],
        cities: [],
        services: [],
        company: post.name
    };
    
    // Extract phone numbers
    const phoneRegex = /(\+?\d{1,4}[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4,}/g;
    const phones = content.match(phoneRegex) || [];
    info.phones = phones.filter(phone => 
        phone.length >= 8 && 
        !phone.match(/^\d{4,6}$/) && // Filter out short numbers
        !phone.includes('€') && // Not currency
        !phone.includes('$')
    );
    
    // Extract emails
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emails = content.match(emailRegex) || [];
    info.emails = [...new Set(emails)]; // Remove duplicates
    
    // Extract websites
    const urlRegex = /https?:\/\/[^\s]+/g;
    const websites = content.match(urlRegex) || [];
    info.websites = websites;
    
    // Extract cities/locations
    const cityPatterns = [
        /\b(Tunis|Casablanca|Rabat|Marrakech|Fez|Agadir|Tangier|Oujda|Kenitra|Tetouan|Safi)\b/gi,
        /\b(Alger|Oran|Constantine|Annaba|Blida|Batna|Sétif|Batna|Sidi Bel Abbès|Biskra)\b/gi,
        /\b(Paris|Marseille|Lyon|Toulouse|Nice|Nantes|Strasbourg|Montpellier|Bordeaux)\b/gi,
        /\b(Brussels|Antwerp|Ghent|Liège|Namur)\b/gi,
        /\b(Madrid|Barcelona|Valencia|Seville|Bilbao)\b/gi,
        /\b(Rome|Milan|Naples|Turin|Palermo|Genoa)\b/gi
    ];
    
    cityPatterns.forEach(pattern => {
        const matches = content.match(pattern) || [];
        info.cities.push(...matches);
    });
    
    // Identify services based on keywords
    const serviceKeywords = {
        'voip': ['VoIP', 'SIP', 'trunking', 'téléphonie'],
        'call-center': ['centre d\'appel', 'call center', 'téléopérateur', 'téléconseiller'],
        'energy': ['énergie', 'thermie', 'pompe à chaleur', 'isolation', 'solaire'],
        'insurance': ['assurance', 'mutuelle', 'prévoyance'],
        'data': ['données', 'data', 'prospection'],
        'marketing': ['marketing', 'communication'],
        'customer-service': ['service client', 'relation client'],
        'sales': ['vente', 'télévente', 'commercial']
    };
    
    Object.keys(serviceKeywords).forEach(service => {
        const keywords = serviceKeywords[service];
        if (keywords.some(keyword => content.toLowerCase().includes(keyword.toLowerCase()))) {
            info.services.push(service);
        }
    });
    
    return info;
}

// Determine business type
function determineBusinessType(info, postName, content) {
    const name = postName.toLowerCase();
    const fullText = content.join(' ').toLowerCase();
    
    // Check for data vendors
    if (fullText.includes('data') && (fullText.includes('vendeur') || fullText.includes('fournisseur'))) {
        return 'data-vendor';
    }
    
    // Check for individuals
    if (name.includes('installateur') || 
        name.includes('sylia') || 
        fullText.includes('recrutement pour') ||
        (fullText.includes('cherche') && !fullText.includes('centre'))) {
        return 'individual';
    }
    
    // Default to call-center for most business posts
    return 'call-center';
}

// Determine country based on phone numbers and cities
function determineCountry(phones, cities, content) {
    // Phone number country codes
    if (phones.some(phone => phone.startsWith('+212'))) return 'Morocco';
    if (phones.some(phone => phone.startsWith('+216'))) return 'Tunisia';
    if (phones.some(phone => phone.startsWith('+213'))) return 'Algeria';
    if (phones.some(phone => phone.startsWith('+33'))) return 'France';
    if (phones.some(phone => phone.startsWith('+32'))) return 'Belgium';
    if (phones.some(phone => phone.startsWith('+49'))) return 'Germany';
    if (phones.some(phone => phone.startsWith('+39'))) return 'Italy';
    if (phones.some(phone => phone.startsWith('+1'))) return 'Canada';
    
    // City-based country detection
    if (cities.some(city => ['Tunis', 'Casablanca', 'Rabat', 'Marrakech', 'Fez', 'Agadir', 'Tangier', 'Oujda', 'Kenitra', 'Tetouan', 'Safi'].includes(city))) {
        return 'Morocco';
    }
    if (cities.some(city => ['Tunis', 'Sousse', 'Sfax', 'Nabeul', 'Ariana', 'Hammamet', 'Bizerte', 'Monastir'].includes(city))) {
        return 'Tunisia';
    }
    if (cities.some(city => ['Alger', 'Oran', 'Constantine', 'Annaba'].includes(city))) {
        return 'Algeria';
    }
    if (cities.some(city => ['Paris', 'Marseille', 'Lyon', 'Toulouse', 'Nice', 'Nantes'].includes(city))) {
        return 'France';
    }
    
    return '';
}

// Extract positions count
function extractPositions(content) {
    const positionPatterns = [
        /(\d+)\s*positions?/gi,
        /(\d+)\s*postes?/gi,
        /(\d+)\s*agents?/gi,
        /recrute.*?(\d+)/gi
    ];
    
    for (const pattern of positionPatterns) {
        const match = pattern.exec(content.join(' '));
        if (match) {
            const num = parseInt(match[1]);
            if (num > 0 && num < 1000) { // Reasonable range
                return num;
            }
        }
    }
    return 0;
}

// Generate tags from services
function generateTags(services, content) {
    const tags = [...services];
    
    // Add language tags
    if (content.join(' ').toLowerCase().includes('français')) tags.push('francophone');
    if (content.join(' ').toLowerCase().includes('arabe')) tags.push('arabophone');
    if (content.join(' ').toLowerCase().includes('anglais')) tags.push('anglophone');
    if (content.join(' ').toLowerCase().includes('espagnol')) tags.push('hispanophone');
    
    // Add remote work tag
    if (content.join(' ').toLowerCase().includes('télétravail') || content.join(' ').toLowerCase().includes('remote')) {
        tags.push('remote_work');
    }
    
    // Add recruitment tag
    if (content.join(' ').toLowerCase().includes('recrute') || content.join(' ').toLowerCase().includes('emploi')) {
        tags.push('recruitment');
    }
    
    return tags;
}

// Main conversion function
function convertToProspects() {
    const posts = parseFacebookPosts(facebookPosts);
    const prospects = [];
    
    posts.forEach((post, index) => {
        try {
            const info = extractBusinessInfo(post);
            const businessType = determineBusinessType(info, post.name, post.content);
            const country = determineCountry(info.phones, info.cities, post.content);
            const positions = extractPositions(post.content);
            const tags = generateTags(info.services, post.content);
            
            // Create notes from content
            const notes = post.content.join(' ').substring(0, 500); // Limit length
            
            // Skip posts that are too short or invalid
            if (post.content.length < 2 || post.content.join(' ').length < 50) {
                return;
            }
            
            // Create prospect object
            const prospect = {
                name: post.name.trim(),
                businessType: businessType,
                country: country,
                city: info.cities.length > 0 ? info.cities[0] : '',
                positions: positions,
                phones: info.phones.length > 0 ? info.phones.join('; ') : '',
                emails: info.emails.length > 0 ? info.emails.join('; ') : '',
                websites: info.websites.length > 0 ? info.websites.join('; ') : '',
                address: '',
                source: 'facebook_post',
                tags: tags.join('; '),
                notes: notes,
                status: 'pending',
                priority: 'medium',
                prospectDate: '2025-11-11',
                createdAt: new Date().toISOString()
            };
            
            prospects.push(prospect);
            
        } catch (error) {
            console.error(`Error processing post ${index}:`, error.message);
        }
    });
    
    return prospects;
}

// Run conversion
const prospects = convertToProspects();

// Save to file
const outputPath = 'facebook-posts-prospects-2025-11-11.json';
writeFileSync(outputPath, JSON.stringify(prospects, null, 2));

console.log(`✅ Successfully converted ${prospects.length} Facebook posts to CRM prospects`);
console.log(`📁 Output saved to: ${outputPath}`);

// Display summary
const businessTypes = prospects.reduce((acc, p) => {
    acc[p.businessType] = (acc[p.businessType] || 0) + 1;
    return acc;
}, {});

const countries = prospects.reduce((acc, p) => {
    if (p.country) acc[p.country] = (acc[p.country] || 0) + 1;
    return acc;
}, {});

console.log('\n📊 Summary:');
console.log('Business Types:', businessTypes);
console.log('Countries:', countries);
console.log('Total with phones:', prospects.filter(p => p.phones).length);
console.log('Total with emails:', prospects.filter(p => p.emails).length);