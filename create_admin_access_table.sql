-- Table pour stocker les codes d'accès administration
CREATE TABLE IF NOT EXISTS admin_access_codes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(8) NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insérer un code d'accès par défaut (à changer par le SuperAdmin)
INSERT INTO admin_access_codes (code, active) VALUES ('Admin1!@', 1);
