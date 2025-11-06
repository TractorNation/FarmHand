pub fn hash_data(data: &String) -> Result<String, String> {
  let hashed = md5::compute(data);
  let result = format!("{:x}", hashed)[..8].to_string();
  Ok(result)
}