const createQuestion = (idPrefix, index, text, options) => ({
  id: `${idPrefix}-${index + 1}`,
  question: text,
  options,
});

const createLevelQuestions = (skillId, level, prompts) =>
  prompts.map((prompt, index) =>
    createQuestion(
      `${skillId}-${level.toLowerCase()}`,
      index,
      prompt.question,
      prompt.options
    )
  );

const LEVELS = ['Beginner', 'Intermediate', 'Professional'];

const cybersecurityPrompts = {
  Beginner: [
    {
      question: 'What is the primary goal of cybersecurity?',
      options: [
        'To install hardware firewalls',
        'To protect systems, networks, and data from attacks',
        'To improve internet speed',
        'To automate backups',
      ],
    },
    {
      question: 'Which of the following best describes phishing?',
      options: [
        'Testing network performance',
        'Tricking users into revealing sensitive information',
        'Encrypting files for secure storage',
        'Scanning ports on a server',
      ],
    },
    {
      question: 'What does MFA stand for?',
      options: [
        'Multi-Factor Authentication',
        'Managed Firewall Application',
        'Malware Filtering Algorithm',
        'Multi-File Archive',
      ],
    },
    {
      question: 'A strong password should include:',
      options: [
        'Only lowercase letters',
        'Personal information',
        'A mix of characters, numbers, and symbols',
        'The word “password”',
      ],
    },
    {
      question: 'Which device often acts as the first line of defense on a network?',
      options: ['Router', 'Switch', 'Firewall', 'Printer'],
    },
    {
      question: 'What is malware?',
      options: [
        'Authorized software updates',
        'Malicious software designed to harm',
        'Network monitoring tools',
        'Encrypted traffic',
      ],
    },
    {
      question: 'Which of the following is a common sign of a phishing email?',
      options: [
        'Personalized greeting and correct domain',
        'Unexpected attachments and urgent language',
        'Delivered from a known contact',
        'Contains company logo and signature',
      ],
    },
    {
      question: 'VPN helps protect your privacy by:',
      options: [
        'Blocking all ads',
        'Creating an encrypted tunnel for data traffic',
        'Duplicating your network',
        'Deleting cookies automatically',
      ],
    },
    {
      question: 'Why are software updates important for security?',
      options: [
        'They increase screen brightness',
        'They patch known vulnerabilities',
        'They reduce internet usage',
        'They remove all logs',
      ],
    },
    {
      question: 'Which type of malware locks data and demands payment?',
      options: ['Spyware', 'Ransomware', 'Adware', 'Botnet'],
    },
  ],
  Intermediate: [
    {
      question: 'What does the CIA triad stand for in cybersecurity?',
      options: [
        'Confidentiality, Integrity, Availability',
        'Control, Identification, Authentication',
        'Compliance, Inspection, Analysis',
        'Confidentiality, Investigation, Audit',
      ],
    },
    {
      question: 'Which tool is commonly used for network intrusion detection?',
      options: ['Wireshark', 'Nmap', 'Snort', 'Burp Suite'],
    },
    {
      question: 'What is the purpose of a SIEM platform?',
      options: [
        'Coordinate remote teams',
        'Aggregate and analyze security logs',
        'Provide user training modules',
        'Compress backup archives',
      ],
    },
    {
      question: 'A zero-day vulnerability is best described as:',
      options: [
        'A vulnerability discovered on day zero of development',
        'A vulnerability with a patch released',
        'A previously unknown vulnerability without a fix',
        'A vulnerability used only in theory',
      ],
    },
    {
      question: 'What is lateral movement in an attack chain?',
      options: [
        'The initial exploitation of a network',
        'Moving across systems to gain broader access',
        'Deleting traces after an attack',
        'Scanning external ports only',
      ],
    },
    {
      question: 'Which encryption method uses one key for encryption and decryption?',
      options: [
        'Asymmetric encryption',
        'Quantum encryption',
        'Symmetric encryption',
        'Homomorphic encryption',
      ],
    },
    {
      question: 'What is the main function of a honeypot?',
      options: [
        'To accelerate traffic routing',
        'To entice attackers and study their behavior',
        'To encrypt database tables',
        'To provide redundancy for servers',
      ],
    },
    {
      question: 'Which framework helps align security controls with NIST guidance?',
      options: ['CIS Controls', 'ISO 9001', 'PMBOK', 'COBIT Lite'],
    },
    {
      question: 'What does EDR stand for?',
      options: [
        'Endpoint Detection and Response',
        'Enterprise Data Repository',
        'Encrypted Data Relay',
        'External Defense Ring',
      ],
    },
    {
      question: 'Which attack involves exploiting trust between two systems?',
      options: ['DDoS', 'Man-in-the-middle', 'Brute force', 'SQL Injection'],
    },
  ],
  Professional: [
    {
      question: 'Which technique best supports threat hunting at scale?',
      options: [
        'Manual log review in each system',
        'Automated behavior analytics with hypothesis-driven investigation',
        'Random port blocking',
        'Disabling user accounts weekly',
      ],
    },
    {
      question: 'What is the MITRE ATT&CK framework used for?',
      options: [
        'Documenting software licenses',
        'Cataloging adversary tactics and techniques',
        'Monitoring physical security',
        'Scheduling patch windows',
      ],
    },
    {
      question: 'Which standard is most relevant for establishing an ISMS?',
      options: ['ISO 27001', 'SOC 2 Type I', 'PCI DSS', 'GDPR'],
    },
    {
      question: 'When leading an incident response, which phase comes after containment?',
      options: [
        'Preparation',
        'Eradication and recovery',
        'Lessons learned',
        'Detection and analysis',
      ],
    },
    {
      question: 'What is purple teaming?',
      options: [
        'A form of management training',
        'Collaboration between red and blue teams to improve defenses',
        'A compliance certification',
        'A supply chain security initiative',
      ],
    },
    {
      question: 'Which control best mitigates privilege escalation?',
      options: [
        'Open SSH access to all users',
        'Enforcing least privilege with just-in-time access',
        'Disabling MFA for admins',
        'Sharing admin passwords verbally',
      ],
    },
    {
      question: 'How does threat intelligence feed into SOC operations?',
      options: [
        'It replaces the need for monitoring tools',
        'It provides context to enrich alerts and guide proactive defense',
        'It is stored for audit purposes only',
        'It is shared only with executives',
      ],
    },
    {
      question: 'Which approach helps validate security posture against advanced threats?',
      options: [
        'Annual antivirus update',
        'Ad-hoc penetration tests with no scope',
        'Continuous red team exercises and breach simulations',
        'Weekly password rotation reminders',
      ],
    },
    {
      question: 'What is an effective way to manage third-party risk?',
      options: [
        'Rely on vendor statements alone',
        'Implement a vendor risk management program with continuous monitoring',
        'Disable vendor access completely',
        'Sign NDAs without assessments',
      ],
    },
    {
      question: 'Which metric best evaluates SOC efficiency?',
      options: [
        'Number of endpoints connected',
        'Mean time to detect and respond (MTTD/MTTR)',
        'Total internet bandwidth',
        'Number of blocked ports',
      ],
    },
  ],
};

const dataSciencePrompts = {
  Beginner: [
    {
      question: 'What is the primary goal of data analysis?',
      options: [
        'Store data in spreadsheets',
        'Extract insights to inform decisions',
        'Increase file sizes',
        'Disable data collection',
      ],
    },
    {
      question: 'Which of the following is a common data format?',
      options: ['JPEG', 'CSV', 'MP3', 'PSD'],
    },
    {
      question: 'What does “cleaning data” mean?',
      options: [
        'Deleting all old files',
        'Fixing errors and handling missing values',
        'Compressing datasets',
        'Locking spreadsheets',
      ],
    },
    {
      question: 'Which library is popular for data manipulation in Python?',
      options: ['NumPy', 'Pandas', 'Matplotlib', 'TensorFlow'],
    },
    {
      question: 'What is a dataset?',
      options: [
        'A single number',
        'A structured collection of related data',
        'A graph with labels',
        'A computer program',
      ],
    },
    {
      question: 'What chart would you use to show data distribution?',
      options: ['Histogram', 'Pie chart', 'Line chart', 'Gantt chart'],
    },
    {
      question: 'What is the target variable in supervised learning?',
      options: ['Input feature', 'Hyperparameter', 'Label to predict', 'Model'],
    },
    {
      question: 'Which tool helps visualize data interactively?',
      options: ['Excel Formula', 'Tableau', 'Notepad', 'Paint'],
    },
    {
      question: 'What does bias in data imply?',
      options: [
        'Data is perfectly balanced',
        'Systematic error affecting results',
        'Random noise in data',
        'Extra columns in dataset',
      ],
    },
    {
      question: 'Which statement describes a feature in a dataset?',
      options: [
        'The final model output',
        'A measurable attribute used as input',
        'The test dataset only',
        'The average of labels',
      ],
    },
  ],
  Intermediate: [
    {
      question: 'What is the difference between classification and regression?',
      options: [
        'Classification predicts categories; regression predicts continuous values',
        'Classification is faster than regression',
        'Regression works only on images',
        'They are the same',
      ],
    },
    {
      question: 'What does cross-validation help evaluate?',
      options: [
        'Model performance stability',
        'Data loading speed',
        'UI usability',
        'Cloud deployment cost',
      ],
    },
    {
      question: 'Which metric is suitable for imbalanced classification?',
      options: ['Accuracy', 'Precision-Recall', 'MAE', 'R-squared'],
    },
    {
      question: 'What is feature engineering?',
      options: [
        'Selecting hardware for clusters',
        'Creating or transforming input variables to improve models',
        'Changing project timelines',
        'Encrypting datasets',
      ],
    },
    {
      question: 'Which technique reduces dimensionality?',
      options: ['PCA', 'Gradient boosting', 'Bagging', 'Bootstrapping'],
    },
    {
      question: 'What is overfitting?',
      options: [
        'Model underperforms on training data',
        'Model performs well on training but poorly on unseen data',
        'Model uses too many features',
        'Model runs quickly',
      ],
    },
    {
      question: 'Which algorithm is a clustering method?',
      options: ['K-Means', 'Logistic Regression', 'XGBoost', 'ARIMA'],
    },
    {
      question: 'What is the role of a confusion matrix?',
      options: [
        'Visualize errors in classification',
        'Optimize database schemas',
        'Encrypt data in transit',
        'Manage user access',
      ],
    },
    {
      question: 'Which approach can handle missing data?',
      options: [
        'Mean/median imputation',
        'Dropping columns always',
        'Randomizing values',
        'Increasing batch size',
      ],
    },
    {
      question: 'Why use a validation set?',
      options: [
        'Tune hyperparameters without leaking test performance',
        'Store raw data backups',
        'Document experiments',
        'Share reports with stakeholders',
      ],
    },
  ],
  Professional: [
    {
      question: 'What is MLOps primarily concerned with?',
      options: [
        'Optimizing user experience',
        'Operationalizing machine learning models at scale',
        'Designing UI mockups',
        'Creating marketing campaigns',
      ],
    },
    {
      question: 'Which technique helps interpret complex models?',
      options: ['SHAP values', 'Gradient descent', 'Learning rate schedule', 'Pooling'],
    },
    {
      question: 'How would you address concept drift?',
      options: [
        'Ignore model performance metrics',
        'Monitor data distribution and retrain models as needed',
        'Increase training epochs indefinitely',
        'Disable online learning',
      ],
    },
    {
      question: 'Which strategy enhances model fairness?',
      options: [
        'Oversampling underrepresented groups thoughtfully',
        'Randomly removing data',
        'Reducing feature count arbitrarily',
        'Shortening training time',
      ],
    },
    {
      question: 'What is an appropriate approach to deploy a model with low downtime?',
      options: ['Shadow deployment', 'Manual file copy', 'Offline inference only', 'CSV handoff'],
    },
    {
      question: 'How can you ensure reproducible experiments?',
      options: [
        'Version datasets, code, and configurations',
        'Use informal documentation',
        'Train models only once',
        'Store experiments on local desktops',
      ],
    },
    {
      question: 'Which metric best tracks regression model drift in production?',
      options: ['ROC-AUC', 'Population stability index', 'Recall', 'BLEU score'],
    },
    {
      question: 'How do you evaluate ROI of a machine learning initiative?',
      options: [
        'Measure business KPIs before and after deployment',
        'Compare model size only',
        'Estimate based on training accuracy',
        'Ask team members to vote',
      ],
    },
    {
      question: 'What does a data governance program help establish?',
      options: [
        'Policies for data quality, ownership, and security',
        'User interface guidelines',
        'Hardware upgrade cycles',
        'Office seating charts',
      ],
    },
    {
      question: 'Which approach supports scalable feature pipelines?',
      options: [
        'Feature stores with streaming support',
        'Manual CSV updates',
        'Spreadsheet macros',
        'Quarterly notebooks run',
      ],
    },
  ],
};

const fullstackPrompts = {
  Beginner: [
    {
      question: 'What does HTML provide in a web page?',
      options: [
        'Styling rules',
        'Database queries',
        'Structure and content',
        'Server routing',
      ],
    },
    {
      question: 'Which language primarily styles web components?',
      options: ['Java', 'CSS', 'Python', 'SQL'],
    },
    {
      question: 'What does API stand for?',
      options: [
        'Application Programming Interface',
        'Automated Processing Index',
        'Active Protocol Instance',
        'Application Policy Integration',
      ],
    },
    {
      question: 'Which HTTP method is used to retrieve data?',
      options: ['GET', 'POST', 'DELETE', 'PATCH'],
    },
    {
      question: 'What is a responsive layout?',
      options: [
        'A layout that adapts to various screen sizes',
        'A layout that loads fastest',
        'A layout for servers only',
        'A layout without CSS',
      ],
    },
    {
      question: 'Which tool can bundle JavaScript modules?',
      options: ['Webpack', 'Git', 'Docker', 'Babel'],
    },
    {
      question: 'What is a component in modern frontend frameworks?',
      options: [
        'A standalone piece of UI with behavior',
        'A database table',
        'A CSS class',
        'A REST endpoint',
      ],
    },
    {
      question: 'Which database is document-oriented?',
      options: ['MongoDB', 'MySQL', 'PostgreSQL', 'Oracle'],
    },
    {
      question: 'What is Git used for?',
      options: [
        'Version control',
        'Styling layouts',
        'Writing SQL queries',
        'Managing hardware',
      ],
    },
    {
      question: 'Which command installs dependencies in a Node.js project?',
      options: ['npm install', 'node start', 'git clone', 'yarn run build'],
    },
  ],
  Intermediate: [
    {
      question: 'What does CORS enable in web applications?',
      options: [
        'Cross-origin resource sharing',
        'Compression of response streams',
        'Caching of static assets',
        'Creation of server logs',
      ],
    },
    {
      question: 'Which pattern helps manage global state in React?',
      options: ['Flux/Redux', 'MVC', 'Observer', 'Singleton'],
    },
    {
      question: 'What is server-side rendering (SSR)?',
      options: [
        'Rendering pages on the server before sending them to the client',
        'Executing scripts on the client only',
        'Rendering images as SVG',
        'Encrypting client requests',
      ],
    },
    {
      question: 'How do you secure REST endpoints?',
      options: [
        'Implement authentication, authorization, and input validation',
        'Disable HTTPS',
        'Use only GET requests',
        'Open all ports',
      ],
    },
    {
      question: 'Which database concept ensures data consistency across transactions?',
      options: ['ACID properties', 'CRUD', 'JSON schemas', 'Graph traversal'],
    },
    {
      question: 'What is containerization used for?',
      options: [
        'Packaging applications with dependencies into isolated environments',
        'Designing UI components',
        'Improving CSS animations',
        'Documenting user stories',
      ],
    },
    {
      question: 'Which tool manages infrastructure as code?',
      options: ['Terraform', 'Webpack', 'Sass', 'Redux Toolkit'],
    },
    {
      question: 'What does GraphQL provide compared to REST?',
      options: [
        'Flexible queries allowing clients to request specific data',
        'Faster network speed',
        'Automatic caching only',
        'No need for backend',
      ],
    },
    {
      question: 'Which practice ensures automated testing on every commit?',
      options: ['Continuous Integration', 'Waterfall', 'Code review', 'Branching'],
    },
    {
      question: 'What is a microservice architecture?',
      options: [
        'Collection of small services communicating over APIs',
        'Single monolithic application',
        'Frontend-only solution',
        'Batch processing script',
      ],
    },
  ],
  Professional: [
    {
      question: 'Which strategy improves performance in large-scale React apps?',
      options: [
        'Using React Query or SWR for data caching and background updates',
        'Writing inline styles only',
        'Disabling memoization',
        'Avoiding code splitting',
      ],
    },
    {
      question: 'How can you ensure observability in distributed systems?',
      options: [
        'Implement tracing, metrics, and logs with correlation IDs',
        'Rely on manual monitoring',
        'Increase server hardware only',
        'Disable logs in production',
      ],
    },
    {
      question: 'What does blue-green deployment achieve?',
      options: [
        'Zero-downtime releases by switching traffic between environments',
        'Automatic schema migration',
        'Security hardening',
        'User analytics',
      ],
    },
    {
      question: 'Which practice improves API resilience?',
      options: [
        'Circuit breakers and retries with exponential backoff',
        'Ignoring timeouts',
        'Single region deployment',
        'Executing all requests synchronously',
      ],
    },
    {
      question: 'How do you manage secrets in production apps?',
      options: [
        'Use secret managers or vaults with role-based access',
        'Store in plain text config',
        'Commit to version control',
        'Share via email',
      ],
    },
    {
      question: 'What is domain-driven design (DDD) used for?',
      options: [
        'Model complex business domains through bounded contexts',
        'Design UI mockups',
        'Increase network bandwidth',
        'Automate deployments',
      ],
    },
    {
      question: 'Which approach helps scale databases horizontally?',
      options: ['Sharding and replication', 'Adding more CPU only', 'Using CSV files', 'Cron jobs'],
    },
    {
      question: 'How can you ensure accessibility in modern web apps?',
      options: [
        'Implement semantic HTML, ARIA labels, and automated accessibility tests',
        'Disable keyboard navigation',
        'Use images for all text',
        'Rely on color only',
      ],
    },
    {
      question: 'What is a reasonable strategy for performance budgets?',
      options: [
        'Define thresholds for metrics like LCP, FID, and bundle size',
        'Increase bundle size gradually',
        'Ignore mobile users',
        'Disable caching',
      ],
    },
    {
      question: 'Which tooling supports container orchestration at scale?',
      options: ['Kubernetes', 'Jenkins', 'Yarn', 'Sass'],
    },
  ],
};

const frontendPrompts = {
  Beginner: [
    {
      question: 'What does CSS control on a web page?',
      options: [
        'Content structure',
        'Server logic',
        'Styling and layout',
        'Database queries',
      ],
    },
    {
      question: 'Which HTML element represents the largest heading?',
      options: ['<h1>', '<h6>', '<p>', '<header>'],
    },
    {
      question: 'What does responsive design ensure?',
      options: [
        'Web pages look good on different devices and screen sizes',
        'Web pages only work on desktops',
        'Pages load without images',
        'All text is uppercase',
      ],
    },
    {
      question: 'Which property creates space inside an element border?',
      options: ['Margin', 'Padding', 'Border', 'Display'],
    },
    {
      question: 'What is the purpose of alt text on images?',
      options: [
        'Improve SEO and accessibility',
        'Increase font size',
        'Change background color',
        'Embed scripts',
      ],
    },
    {
      question: 'Which unit is relative to the root font size?',
      options: ['rem', 'px', 'cm', 'vh'],
    },
    {
      question: 'What does flexbox help with?',
      options: [
        'Layout alignment and spacing',
        'Database connections',
        'Server routing',
        'Audio playback',
      ],
    },
    {
      question: 'Which tool inspects styles in the browser?',
      options: ['DevTools', 'Task Manager', 'Terminal', 'Paint'],
    },
    {
      question: 'What is semantic HTML?',
      options: [
        'Using tags that convey meaning about the content',
        'Mixing scripts and styles',
        'Compressing images',
        'Using tables for layout',
      ],
    },
    {
      question: 'Which CSS property changes text color?',
      options: ['color', 'background-color', 'border-color', 'outline'],
    },
  ],
  Intermediate: [
    {
      question: 'What is the main advantage of using a component library?',
      options: [
        'Consistency and faster UI development',
        'Removing CSS entirely',
        'Avoiding user input',
        'Reducing HTML tags',
      ],
    },
    {
      question: 'Which hook manages state in React components?',
      options: ['useState', 'useMemo', 'useRef', 'useEffect'],
    },
    {
      question: 'What does code splitting improve?',
      options: ['Initial load performance', 'CSS specificity', 'Database speed', 'Color contrast'],
    },
    {
      question: 'How do you improve accessibility for custom controls?',
      options: [
        'Add ARIA roles and keyboard support',
        'Hide from screen readers',
        'Disable focus states',
        'Use images for text',
      ],
    },
    {
      question: 'Which tool analyzes bundle size?',
      options: ['webpack-bundle-analyzer', 'ESLint', 'Prettier', 'Jest'],
    },
    {
      question: 'What is hydration in SSR frameworks?',
      options: [
        'Attaching event listeners to server-rendered markup',
        'Compressing CSS files',
        'Rendering WebGL animations',
        'Scheduling animation frames',
      ],
    },
    {
      question: 'Which API improves perceived performance during navigation?',
      options: ['Intersection Observer', 'Geolocation', 'Clipboard', 'WebRTC'],
    },
    {
      question: 'What does CSS-in-JS provide?',
      options: [
        'Scoped styles and dynamic theming at runtime',
        'Faster SQL queries',
        'Static HTML generation',
        'Automatic testing',
      ],
    },
    {
      question: 'How do you prevent layout shift for images?',
      options: [
        'Reserve space with width and height attributes',
        'Load images last',
        'Use inline styles only',
        'Set overflow: hidden',
      ],
    },
    {
      question: 'What is the purpose of Storybook?',
      options: [
        'Develop and preview UI components in isolation',
        'Run integration tests',
        'Monitor network requests',
        'Compile TypeScript',
      ],
    },
  ],
  Professional: [
    {
      question: 'Which metric measures visual stability in Core Web Vitals?',
      options: ['CLS', 'LCP', 'FID', 'TTI'],
    },
    {
      question: 'How can you implement design tokens effectively?',
      options: [
        'Centralize CSS variables mapped to semantic values',
        'Copy styles into each component manually',
        'Store styles in spreadsheets',
        'Use inline styles exclusively',
      ],
    },
    {
      question: 'What approach enables themeable, reusable design systems?',
      options: [
        'Composable architecture with style primitives',
        'Coupling components to pages',
        'Avoiding documentation',
        'Using only static designs',
      ],
    },
    {
      question: 'Which tool audits performance and accessibility automatically?',
      options: ['Lighthouse CI', 'Git Hooks', 'Mocha', 'Swagger'],
    },
    {
      question: 'How do you optimize large lists in React?',
      options: [
        'Windowing/virtualization with libraries like react-window',
        'Render all items at once',
        'Disable keys on list items',
        'Use tables for everything',
      ],
    },
    {
      question: 'What is an effective pattern for managing design handoff?',
      options: [
        'Shared Figma libraries synced with coded components',
        'Emailing screenshots',
        'Documenting in PDFs only',
        'Having no feedback loop',
      ],
    },
    {
      question: 'How can you enforce accessible color contrast?',
      options: [
        'Automated linting and visual regression tests',
        'Manually adjusting each page monthly',
        'Removing all colors',
        'Lowering opacity of text',
      ],
    },
    {
      question: 'Which strategy keeps CSS scalable in large apps?',
      options: [
        'Adopting utility-first or BEM methodologies with tooling',
        'Writing global selectors for everything',
        'Avoiding code reviews',
        'Inline styling across files',
      ],
    },
    {
      question: 'What helps manage micro-frontend communication?',
      options: [
        'Shared event bus or federated modules',
        'Duplicating state across teams',
        'Relying on global variables only',
        'Merging all bundles manually',
      ],
    },
    {
      question: 'Which API enables rich animations with high performance?',
      options: ['Web Animations API', 'Local Storage', 'WebSocket', 'Fetch'],
    },
  ],
};

const backendPrompts = {
  Beginner: [
    {
      question: 'What is a REST API?',
      options: [
        'A style of web services using standard HTTP methods',
        'A desktop application',
        'A CSS framework',
        'An operating system',
      ],
    },
    {
      question: 'Which HTTP method is idempotent?',
      options: ['POST', 'PUT', 'PATCH', 'CONNECT'],
    },
    {
      question: 'What does CRUD stand for?',
      options: [
        'Create, Read, Update, Delete',
        'Cache, Route, Update, Deploy',
        'Compile, Run, Upload, Debug',
        'Create, Rollback, Upgrade, Deploy',
      ],
    },
    {
      question: 'Which database is relational?',
      options: ['PostgreSQL', 'MongoDB', 'Redis', 'Elasticsearch'],
    },
    {
      question: 'What is an endpoint?',
      options: [
        'A URL that clients can access on an API',
        'A database table',
        'An HTML page',
        'A CSS selector',
      ],
    },
    {
      question: 'Which tool manages Node.js packages?',
      options: ['npm', 'Pip', 'Composer', 'Gem'],
    },
    {
      question: 'What does status code 404 mean?',
      options: [
        'Success',
        'Resource not found',
        'Server error',
        'Unauthorized',
      ],
    },
    {
      question: 'What is middleware in backend frameworks?',
      options: [
        'Functions that handle requests before reaching routes',
        'A type of database',
        'A CSS preprocessor',
        'A testing library',
      ],
    },
    {
      question: 'What is the purpose of environment variables?',
      options: [
        'Store configuration securely outside code',
        'Style the UI',
        'Render templates',
        'Compress logs',
      ],
    },
    {
      question: 'What does JSON stand for?',
      options: [
        'JavaScript Object Notation',
        'Java Service Object Network',
        'Joined SQL Output Name',
        'JavaScript Operation Node',
      ],
    },
  ],
  Intermediate: [
    {
      question: 'What does ACID ensure in databases?',
      options: [
        'Reliable transactions with atomicity, consistency, isolation, durability',
        'High availability only',
        'Faster queries only',
        'Automatic caching',
      ],
    },
    {
      question: 'Which pattern helps separate read and write operations?',
      options: ['CQRS', 'MVC', 'MVVM', 'Repository'],
    },
    {
      question: 'What is connection pooling?',
      options: [
        'Reusing database connections for efficiency',
        'Creating multiple APIs',
        'Caching HTTP responses',
        'Managing CSS classes',
      ],
    },
    {
      question: 'How do you secure APIs with JWT?',
      options: [
        'Issue signed tokens and validate them on protected routes',
        'Store tokens in plain text',
        'Disable HTTPS',
        'Share tokens via email',
      ],
    },
    {
      question: 'What is rate limiting used for?',
      options: [
        'Control the number of requests clients can make',
        'Increase server CPU',
        'Compress assets',
        'Style dashboards',
      ],
    },
    {
      question: 'Which tool monitors API performance?',
      options: ['Prometheus', 'Webpack', 'ESLint', 'Jest'],
    },
    {
      question: 'What does gRPC offer compared to REST?',
      options: [
        'Binary protocol with contract-based communication',
        'Automatic UI generation',
        'Graphical dashboards',
        'Real-time sockets only',
      ],
    },
    {
      question: 'Which database is good for caching key-value pairs?',
      options: ['Redis', 'PostgreSQL', 'Neo4j', 'SQLite'],
    },
    {
      question: 'What is a message queue used for?',
      options: [
        'Decouple services by buffering tasks',
        'Render HTML templates',
        'Run CSS animations',
        'Encrypt passwords',
      ],
    },
    {
      question: 'Which practice improves security posture of APIs?',
      options: [
        'Validation, sanitization, and principle of least privilege',
        'Disabling logs',
        'Allowing all origins',
        'Using HTTP only',
      ],
    },
  ],
  Professional: [
    {
      question: 'How do you design for eventual consistency?',
      options: [
        'Accept temporary inconsistencies with compensating actions and sync processes',
        'Force all writes synchronously',
        'Avoid distributed systems',
        'Disable replication',
      ],
    },
    {
      question: 'What is domain-driven design useful for in backend systems?',
      options: [
        'Aligning services with business capabilities via bounded contexts',
        'Optimizing CSS architecture',
        'Designing mobile apps',
        'Creating mockups',
      ],
    },
    {
      question: 'Which strategy supports zero-downtime migrations?',
      options: [
        'Expand-and-contract schema changes with backwards compatibility',
        'Drop tables immediately',
        'Restart servers during deployment',
        'Disable integrity constraints',
      ],
    },
    {
      question: 'How do you protect against SQL injection?',
      options: [
        'Use prepared statements or ORM parameter binding',
        'Concatenate strings directly',
        'Allow admin queries from users',
        'Disable input validation',
      ],
    },
    {
      question: 'What is the role of a service mesh?',
      options: [
        'Provide observability, security, and traffic control between services',
        'Manage CSS animations',
        'Deploy mobile apps',
        'Generate SQL reports',
      ],
    },
    {
      question: 'Which approach helps manage secrets securely at scale?',
      options: [
        'Centralized secret store with rotation and auditing',
        'Embedding secrets in code',
        'Sharing spreadsheets',
        'Texting admins passwords',
      ],
    },
    {
      question: 'How do you handle backpressure in event-driven systems?',
      options: [
        'Implement buffering, throttling, and consumer scaling',
        'Discard messages',
        'Disable acknowledgements',
        'Increase payload size',
      ],
    },
    {
      question: 'What is chaos engineering?',
      options: [
        'Intentionally stressing systems to improve resilience',
        'Randomly changing code',
        'Unit testing',
        'Scaling vertically',
      ],
    },
    {
      question: 'Which technique improves observability pipelines?',
      options: [
        'Standardized structured logging with correlation IDs',
        'Manual log reviews',
        'Increasing log levels to fatal only',
        'Using print statements',
      ],
    },
    {
      question: 'How can you ensure compliance in regulated industries?',
      options: [
        'Implement auditable controls, monitoring, and policy automation',
        'Disable monitoring to reduce noise',
        'Document policies without enforcement',
        'Use spreadsheets for access control',
      ],
    },
  ],
};

const buildSkill = (id, name, description, promptsByLevel) => {
  const levels = {};
  LEVELS.forEach((level) => {
    levels[level] = createLevelQuestions(id, level, promptsByLevel[level]);
  });

  return {
    id,
    name,
    description,
    levels,
  };
};

export const TECH_SKILLS = [
  buildSkill(
    'cybersecurity',
    'Cybersecurity',
    'Defend infrastructure, monitor threats, and drive incident response with modern security practices.',
    cybersecurityPrompts
  ),
  buildSkill(
    'data-science',
    'Data Science & Analytics',
    'Transform raw information into insights, build predictive models, and deploy data products that matter.',
    dataSciencePrompts
  ),
  buildSkill(
    'fullstack',
    'Full-Stack Development',
    'Design, build, and scale platforms from UI components to backend services with DevOps best practices.',
    fullstackPrompts
  ),
  buildSkill(
    'frontend',
    'Frontend Engineering',
    'Craft accessible, high-performance interfaces with modern frameworks and design systems.',
    frontendPrompts
  ),
  buildSkill(
    'backend',
    'Backend Engineering',
    'Architect resilient APIs, data pipelines, and distributed systems with security and reliability at the core.',
    backendPrompts
  ),
];

export const SKILL_LEVELS = LEVELS;





