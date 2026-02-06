DROP TABLE IF EXISTS worker_daily_finance;

CREATE TABLE worker_daily_finance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  worker_id INT NOT NULL,
  work_date DATE NOT NULL,
  check_in_time TIMESTAMP NULL,
  check_out_time TIMESTAMP NULL,
  worked_minutes INT DEFAULT 0,
  financial_minutes INT DEFAULT 0,
  base_salary DECIMAL(10,2) DEFAULT 0.00,
  late_penalty DECIMAL(10,2) DEFAULT 0.00,
  early_leave_penalty DECIMAL(10,2) DEFAULT 0.00,
  net_salary DECIMAL(10,2) DEFAULT 0.00,
  base_amount DECIMAL(10,2) DEFAULT 0.00,
  deductions DECIMAL(10,2) DEFAULT 0.00,
  bonuses DECIMAL(10,2) DEFAULT 0.00,
  net_amount DECIMAL(10,2) DEFAULT 0.00,
  late_minutes INT DEFAULT 0,
  early_leave_minutes INT DEFAULT 0,
  notes TEXT,
  locked_batch_id INT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_daily_finance_worker_id (worker_id),
  INDEX idx_daily_finance_work_date (work_date),
  INDEX idx_daily_finance_locked_batch (locked_batch_id),
  INDEX idx_daily_finance_worker_date (worker_id, work_date)
);
